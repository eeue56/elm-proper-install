#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const yargs = require('yargs');
const simpleGit = require('simple-git')();
const compareSemver = require('compare-semver');



const yargv = yargs
    .example('elm-proper-install https://github.com/eeue56/elm-ffi', 'Install elm-ffi')
    .example('elm-proper-install', 'Install all packages')
    .alias('v', 'verbose')
    .default('v', false)
    .describe('v', 'Print all messages out')
    .help('h')
    .alias('h', 'help')
    .argv;


const packageName = (url) => {
	return url.replace('https://github.com/', '');
};

const gitUrl = (url) => {
	if (url.startsWith('https')){
		return url;
	}

	return 'https://github.com/' + url;
};


const clonePackage = (url) => {
	return new Promise(function(resolve, reject){
		const name = packageName(url);
		const packageDir = path.join(process.cwd(), "elm-stuff/packages/", name, "/.cloned");
		if (!fs.existsSync(packageDir)) simpleGit.clone(url, packageDir);

		simpleGit
			.cwd(packageDir)
			.checkout('master', function(err){
				if (err !== null) return reject(err);
			})
			.pull()
			.tags(function(err, tags){
				if (err !== null) return reject(err);

				return resolve({
					package: name,
					tags: tags.all
				});
			});
	});

};

const findMatchingVersion = (versionGap, tags) => {
	const versionRegex = /(.+?)([<=]+)[ ]*v[ ]*([<=]+)[ ]*(.+)/;
	var match = versionGap.match(versionRegex);
	var lowBounds = match[1].trim();
	var lowEquals = match[2].trim();
	var highEquals = match[3].trim();
	var highBounds = match[4].trim();
	
	if (lowBounds === highBounds) { 
		if (lowEquals.indexOf(tags) > -1){
			return lowEquals;
		} else {
			return compareSemver.max(tags);
		}
	}

	var withoutTooLow = tags.filter(function(tag){
		if (lowEquals.indexOf("=")){
			return compareSemver.gt(tag, [lowBounds]) || tag == lowBounds;
		} else {
			return compareSemver.gt(tag, [lowBounds]);
		}
	});

	var withoutTooHigh = withoutTooLow.filter(function(tag){
		if (highEquals.indexOf("=")){
			return compareSemver.gt(highBounds, [tag]) || tag == highBounds;
		} else {
			return compareSemver.gt(highBounds, [tag]);
		}
	});

	var foundTag = compareSemver.max(withoutTooHigh);

	if (foundTag === null){
		foundTag = lowBounds;
	}

	return foundTag;
};

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

const main = (elmPackage, packages) => {
	var promises = [];
	var exactDependencies = {};

	packages.map(function(url){
		if (yargv.v) console.log('Installing new package from ' + url);
		promises.push(clonePackage(gitUrl(url)));
	});

	Promise.all(promises).then(function(tags){
		tags.map(function(tagObj) {
			const packageName = tagObj.package;
			const packageDir = path.join("elm-stuff/packages/", packageName, "/.cloned");
			const tags = tagObj.tags;

			var packageString = elmPackage["dependencies"][packageName];
			var version = "";

			if (typeof packageString === "undefined"){
				version = compareSemver.max(tags);
				packageString = `${version} <= v <= ${version}`; 
				elmPackage["dependencies"][packageName] = packageString;

				console.log(`Installing ${packageName} with the string ${packageString}`);
			} else {
				version = findMatchingVersion(elmPackage["dependencies"][packageName], tags);
			}

			if (yargv.v) {
				console.log(`Checking out ${packageName} at ${version}`);
			}

			const versionedDir = path.join(packageDir, '../', version);

			simpleGit
				.cwd(packageDir)
				.checkout(version)
				.then(function(){
					fsExtra.copySync(packageDir, versionedDir);

					var currentElmPackage = require(path.join(process.cwd(), versionedDir, "elm-package.json"));
					var elmMajorVersion = currentElmPackage["elm-version"].split(" ")[0];
					elmMajorVersion = elmMajorVersion.substr(0, elmMajorVersion.lastIndexOf('.'));
					elmMajorVersion += '.0';

					const packageLocation = path.join(getUserHome(), "/.elm/", elmMajorVersion, "package" , packageName, version, 'elm-package.json');

					fsExtra.ensureFileSync(packageLocation);
					fs.writeFileSync(packageLocation, JSON.stringify(currentElmPackage, null, 4));
				});


			exactDependencies[packageName] = version;
			
		});

		fs.writeFileSync(path.join(process.cwd(), './elm-package.json'), JSON.stringify(elmPackage, null, 4));
		fs.writeFileSync(path.join(process.cwd(), './elm-stuff/exact-dependencies.json'), JSON.stringify(exactDependencies, null, 4));


	}).catch((err) => {
		console.log(err);
	});
};



var elmPackage = null;
try { 
	elmPackage = require(path.join(process.cwd(), '/elm-package.json'));
	var packages = yargv._;
	if (packages.length === 0){
		if (yargv.v) console.log('Installing all packages..'); 

		Object.keys(elmPackage["dependencies"]).map(function(name){
			packages.push(name);
		});
	} 
	main(elmPackage, packages);
} catch (e){
	console.error('No elm-package.json found in the current dir!');
	console.log('Maybe you need to run elm-package install --yes first?');
	console.log(e);
}
