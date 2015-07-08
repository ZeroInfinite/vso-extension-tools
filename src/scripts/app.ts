/// <reference path="../../typings/tsd.d.ts" />

import _ = require("lodash");
import chalk = require("chalk");
import errHandler = require("./errorHandler");
import fs = require("fs");
import inquirer = require("inquirer");
import log = require("./logger");
import package = require("./package");
import path = require("path");
import program = require("commander");
import publish = require("./publish");
import Q = require("q");
import settings = require("./settings");
import upgrade = require("./upgrade");

module App {
	let defaultSettings = {
		package: {
			root: process.cwd(),
			manifestGlobs: ["**/*-manifest.json"],
			outputPath: "{auto}",
			overrides: null
		},
		publish: {
			galleryUrl: "https://app.market.visualstudio.com",
			token: null,
			vsixPath: null
		}
	};
	
	function doPackageCreate(settings: settings.PackageSettings): Q.Promise<string> {
		log.info("Begin package creation", 1);
		let merger = new package.Package.Merger(settings);
		log.info("Merge partial manifests", 2);
		return merger.merge().then((manifests) => {
			log.success("Merged successfully");
			let vsixWriter = new package.Package.VsixWriter(manifests.vsoManifest, manifests.vsixManifest);
			log.info("Beginning writing VSIX", 2);
			return vsixWriter.writeVsix(settings.outputPath).then((outPath: string) => {
				log.info("VSIX written to: %s", 3, outPath);
				return outPath;
			});
		}).then((outPath) => {
			log.success("Successfully created VSIX package.");
			return outPath;
		});
	}
	
	function doPublish(settings: settings.PublishSettings): Q.Promise<any> {
		log.info("Begin publish to Gallery", 1);
		let publisher = new publish.Publish.PackagePublisher(settings);
		return publisher.publish(settings.vsixPath).then(() => {
			log.success("Successfully published VSIX from %s to the gallery.", settings.vsixPath);
		});
	}
	
	export function publishVsix(options: settings.CommandLineOptions): Q.Promise<any> {
		return settings.resolveSettings(options, defaultSettings).then((settings) => {
			return Q.Promise<string>((resolve, reject, notify) => {
				try {
					if (!settings.package) {
						log.info("VSIX was manually specified. Skipping generation.", 1);
						resolve(settings.publish.vsixPath);
					} else {
						resolve(doPackageCreate(settings.package));
					}
				} catch (err) {
					reject(err);
				}
			}).then((vsixPath) => {
				settings.publish.vsixPath = vsixPath;
				return doPublish(settings.publish);
			});
		}).catch(errHandler.errLog);
	}
	
	export function createPackage(options: settings.CommandLineOptions): Q.Promise<any> {
		return settings.resolveSettings(options, defaultSettings).then((settings) => {
			return doPackageCreate(settings.package);
		}).catch(errHandler.errLog);
	}
	
	export function createPublisher(name: string, displayName: string, description: string, options: settings.CommandLineOptions): Q.Promise<any> {
		log.info("Creating publisher %s", 1, name);
		return settings.resolveSettings(options, defaultSettings).then((options) => {
			let pubManager = new publish.Publish.PublisherManager(options.publish);
			return pubManager.createPublisher(name, displayName, description).catch(console.error.bind(console));
		}).then(() => {
			log.success("Successfully created publisher `%s`", name);
		}).catch(errHandler.errLog);
	}
	
	export function deletePublisher(publisherName: string, options: settings.CommandLineOptions): Q.Promise<any> {
		log.info("Deleting publisher %s", 1, publisherName);
		return settings.resolveSettings(options, defaultSettings).then((options) => {
			let pubManager = new publish.Publish.PublisherManager(options.publish);
			return pubManager.deletePublisher(publisherName).catch(console.error.bind(console));
		}).then(() => {
			log.success("Successfully deleted publisher `%s`", publisherName);
		}).catch(errHandler.errLog);
	}
	
	export function toM85(pathToManifest: string, publisherName: string, outputPath: string, options: settings.CommandLineOptions): Q.Promise<any> {
		let outPath = outputPath;
		if (!outputPath) {
			outPath = pathToManifest;
		}
		if (fs.existsSync(outPath) && !options.forceOverwrite) {
			log.error("File %s already exists. Specify the -f to force overwriting this file.", outPath);
			process.exit(-1);
		}
		if (!publisherName) {
			log.error("Publisher name not specified.");
			process.exit(-1);
		}
		let upgrader = new upgrade.ToM85(pathToManifest, publisherName);
		return upgrader.execute(outPath).then(() => {
			log.success("Successfully upgraded manifest to M85. Result written to %s", outPath);
		}).catch(errHandler.errLog);
	}
}

let version = process.version;
if (parseInt(version.split(".")[1], 10) < 12) {
	log.error("Please upgrade to NodeJS v0.12.x or higher");
	process.exit(-1);
}

program
	.version("0.0.1")
	.option("--fiddler", "Use the fiddler proxy for REST API calls.")
	.option("--nologo", "Suppress printing the VSET logo.")
	.option("--debug", "Print debug log messages.")
	.usage("command [options]");

program
	.command("package")
	.description("Create a vsix package for an extension.")
	.option("-r, --root <root>", "Specify the root for files in your vsix package. [.]")
	.option("-m, --manifest-glob <glob>", "Specify the pattern for manifest files to join. [**/*-manifest.json]")
	.option("-o, --output-path <output>", "Specify the path and file name of the generated vsix. [..]")
	.option("-s, --settings <settings_path>", "Specify the path to a settings file")
	.action(App.createPackage);
	
program
	.command("publish")
	.description("Publish a VSIX package to your account. Generates the VSIX using [package_settings_path] unless --vsix is specified.")
	.option("-v, --vsix <path_to_vsix>", "If specified, publishes this VSIX package instead of auto-packaging.")
	.option("-r, --root <root>", "Specify the root for files in your vsix package. [.]")
	.option("-m, --manifest-glob <manifest-glob>", "Specify the pattern for manifest files to join. [**/*-manifest.json]")
	.option("-o, --output-path <output>", "Specify the path and file name of the generated vsix. [..]")
	.option("-g, --gallery-url <gallery_url>", "Specify the URL to the gallery.")
	.option("-t, --token <token>", "Specify your personal access token.")
	.option("-s, --settings <settings_path>", "Specify the path to a settings file")
	.action(App.publishVsix);
	
program
	.command("create-publisher <name> <display_name> <description>")
	.description("Create a publisher")
	.option("-g, --gallery-url <gallery_url>", "Specify the URL to the gallery.")
	.option("-t, --token <token>", "Specify your personal access token.")
	.option("-s, --settings <settings_path>", "Specify the path to a settings file")
	.action(App.createPublisher);
	
program
	.command("delete-publisher <publisher_name>")
	.description("Delete a publisher")
	.option("-g, --gallery-url <gallery_url>", "Specify the URL to the gallery.")
	.option("-t, --token <token>", "Specify your personal access token.")
	.option("-s, --settings <settings_path>", "Specify the path to a settings file")
	.action(App.deletePublisher);
	
program
	.command("migrate <path_to_manifest> <publisher_name> [output_path]")
	.description("Convert a manifest to the new contribution model introduced in M85.")
	.option("-f, --force-overwrite", "Overwrite an existing file, or overwrite the original manifest when output_path is not specified.")
	.action(App.toM85);

program.parse(process.argv);

let commandNames = program["commands"].map(c => c._name);
if (program["rawArgs"].length < 3 || commandNames.indexOf(program["rawArgs"][2]) === -1) {
	program.help();
}