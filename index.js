#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
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
		const packageDir = path.join(process.cwd(), "elm-stuff/packages/", name);
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


const main = () => {
	var elmPackage = null;
	try { 
		elmPackage = require('./elm-package.json');
	} catch (e){
		console.error('No elm-package.json found in the current dir!');
		console.log('Maybe you need to run elm-package install --yes first?');
		return;
	}

	var packages = yargv._;
	var promises = [];
	var exactDependencies = {};

	if (packages.length === 0){
		if (yargv.v) console.log('Installing all packages..'); 

		Object.keys(elmPackage["dependencies"]).map(function(name){
			promises.push(clonePackage(gitUrl(name)));
		});
	} 

	packages.map(function(url){
		if (yargv.v) console.log('Installing new package from ' + url);
		promises.push(clonePackage(url));
	});

	Promise.all(promises).then(function(tags){
		tags.map(function(tagObj) {
			const packageName = tagObj.package;
			const packageDir = path.join("elm-stuff/packages/", packageName);
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

			simpleGit
				.cwd(packageDir)
				.checkout(version);

			exactDependencies[packageName] = version;
		});

		fs.writeFileSync('./elm-package.json', JSON.stringify(elmPackage, null, 4));
		fs.writeFileSync('./elm-stuff/exact-dependencies.json', JSON.stringify(exactDependencies, null, 4));
	}).catch((err) => {
		console.log(err);
	});
};

main();