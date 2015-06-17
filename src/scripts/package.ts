/// <reference path="../../typings/tsd.d.ts" />

import _ = require("lodash");
import chalk = require("chalk");
import fs = require("fs");
import glob = require("glob");
import path = require("path");
import Q = require("q");
import stream = require("stream");
import tmp = require("tmp");
import xml = require("xml2js");
import zip = require("jszip");

export module Package {	
	/**
	 * Combines the vsix and vso manifests into one object
	 */
	export interface SplitManifest {
		vsoManifest: any;
		vsixManifest: any;
	}
	
	/**
	 * Describes an asset in a manifest
	 */
	export interface AssetDeclaration {
		type: string;
		path: string;
	}
	
	/**
	 * Settings for doing the merging
	 */
	export interface MergeSettings {
		/**
		 * List of globs for searching for partial manifests
		 */
		manifestGlobs: string[];
	}
	
	/**
	 * Facilitates the gathering/reading of partial manifests and creating the merged
	 * manifests (one vsoManifest and one vsixManifest)
	 */
	export class Merger {
		private static DEFAULT_MERGE_SETTINGS_FILE: string = "merge-settings.json";
		
		private root: string;
		private mergeSettings: MergeSettings;
		
		/**
		 * constructor
		 * @param string Root path for locating candidate manifests
		 */
		constructor(rootPath: string) {
			this.root = rootPath;
			this.parseSettings();
		}	
		
		private parseSettings() {
			this.mergeSettings = {
				manifestGlobs: ["manifests/**/*.json"]
			}
		}
		
		private gatherManifests(globPatterns: string[]): Q.Promise<string[]> {
			var globs = globPatterns.map(pattern => path.join(this.root, pattern));
			return Q.all(globs.map(pattern => this.gatherManifestsFromGlob(pattern))).then((fileLists) => {
				return _.unique(fileLists.reduce((a, b) => { return a.concat(b); }));
			});
		}
		
		private gatherManifestsFromGlob(globPattern: string): Q.Promise<string[]> {
			return Q.Promise<string[]>((resolve, reject, notify) => {
				glob(globPattern, (err, matches) => {
					if (!err) {
						resolve(matches);
					} else {
						reject(err);
					}
				});
			});
		}
		
		/**
		 * Finds all manifests and merges them into two JS Objects: vsoManifest and vsixManifest
		 * @return Q.Promise<SplitManifest> An object containing the two manifests
		 */
		public merge(): Q.Promise<SplitManifest> {
			return this.gatherManifests(this.mergeSettings.manifestGlobs).then((files: string[]) => {
				var manifestPromises: Q.Promise<any>[] = [];
				files.forEach((file) => {
					manifestPromises.push(Q.nfcall<any>(fs.readFile, file, "utf8").then((data) => {
						try {
							var result = JSON.parse(data);
							result.__origin = file; // save the origin in order to resolve relative paths later.
							return result;	
						} catch (err) {
							console.log("Error parsing the JSON in " + file + ": ");
							console.log(data);
							throw err;
						}
					}));
				});
				var defaultVsixManifestPath = path.join(require("app-root-path").path, "src", "tmpl", "default_vsixmanifest.json"); 
				var vsixManifest: any = JSON.parse(fs.readFileSync(defaultVsixManifestPath, "utf8"));
				vsixManifest.__meta_root = this.root;
				var vsoManifest: any = {__meta_root: this.root};
				return Q.all(manifestPromises).then((partials: any[]) => {
					partials.forEach((partial) => {
						// Transform asset paths to be relative to the root of all manifests.
						if (_.isArray(partial["assets"])) {
							(<Array<AssetDeclaration>>partial["assets"]).forEach((asset) => {
								var keys = Object.keys(asset);
								if (keys.length !== 2 || keys.indexOf("type") < 0 || keys.indexOf("path") < 0) {
									throw "Assets must have a type and a path.";
								}
								if (path.isAbsolute(asset.path)) {
									throw "Paths in manifests must be relative.";
								}
								var absolutePath = path.join(path.dirname(partial.__origin), asset.path);
								// console.log("Asset path transform. Abs: " + absolutePath + 
								// 	", root: " + this.root + 
								// 	", partial origin: " + partial.__origin + 
								// 	", asset.path: " + asset.path);
								asset.path = path.relative(this.root, absolutePath);
							});
						}
						
						// Merge each key of each partial manifest into the joined manifests
						Object.keys(partial).forEach((key) => {
							this.mergeKey(key, partial[key], vsoManifest, vsixManifest);
						});
					});
					return <SplitManifest>{vsoManifest: vsoManifest, vsixManifest: vsixManifest};
				});
			}).catch<SplitManifest>(console.error.bind(console));
		}
		
		private mergeKey(key: string, value: any, vsoManifest: any, vsixManifest: any) {
			switch(key.toLowerCase()) {
				case "namespace":
					// Assert string value
					vsoManifest.namespace = value;
					vsixManifest.PackageManifest.Metadata[0].Identity[0].$.Id = value;
					break;
				case "version":
					// Assert string value
					vsoManifest.version = value;
					vsixManifest.PackageManifest.Metadata[0].Identity[0].$.Version = value;
					break;
				case "name":
					// Assert string value
					vsoManifest.name = value;
					vsixManifest.PackageManifest.Metadata[0].DisplayName[0] = value;
					break;
				case "description":
					// Assert string value
					vsoManifest.description = value;
					vsixManifest.PackageManifest.Metadata[0].Description[0]._ = value;
					break;
				case "publisher":
					vsixManifest.PackageManifest.Metadata[0].Identity[0].$.Publisher = value;
					break;
				case "releasenotes":
					vsixManifest.PackageManifest.Metadata[0].ReleaseNotes = [value];
					break;
				case "tags":
					if (_.isArray(value)) {
						value = (<Array<string>>value).join(",");
					}
					vsixManifest.PackageManifest.Metadata[0].Tags = [value];
					break;
				case "vsoflags":
					if (_.isArray(value)) {
						value = (<Array<string>>value).join(",");
					}
					vsixManifest.PackageManifest.Metadata[0].VSOFlags = [value];
					break;
				case "categories":
					if (_.isArray(value)) {
						value = (<Array<string>>value).join(",");
					}
					vsixManifest.PackageManifest.Metadata[0].Categories = [value];
					break;
				case "baseuri":
					// Assert string value
					vsoManifest.baseUri = value;
					break;
				case "contributions":
					if (!vsoManifest.contributions) {
						vsoManifest.contributions = {};
					}
					_.merge(vsoManifest.contributions, value, (objectValue, sourceValue, key, object, source) => {
						if (_.isArray(objectValue)) {
							return (<Array<any>>objectValue).concat(sourceValue);
						}
					});
					break;
				case "contributionpoints":
					if (!vsoManifest.contributionPoints) {
						vsoManifest.contributionPoints = {};
					}
					_.merge(vsoManifest.contributionPoints, value);
					break;
				case "contributiontypes":
					if (!vsoManifest.contributionTypes) {
						vsoManifest.contributionTypes = {};
					}
					_.merge(vsoManifest.contributionTypes, value);
					break;
				case "assets": 
					if (_.isArray(value)) {
						vsixManifest.PackageManifest.Assets = [{"Asset": []}];
						value.forEach((asset: AssetDeclaration) => {
							vsixManifest.PackageManifest.Assets[0].Asset.push({
								"$": {
									"Type": asset.type,
									"d:Source": "File",
									"Path": asset.path.replace(/\\/g, "/")
								}
							});
						});
					}
					break;		
			}
		}	 		
	}
	
	/**
	 * Facilitates packaging the vsix and writing it to a file
	 */
	export class VsixWriter {
		private vsoManifest: any;
		private vsixManifest: any;
		
		private static VSO_MANIFEST_FILENAME: string = "extension.vsomanifest";
		private static VSIX_MANIFEST_FILENAME: string = "extension.vsixmanifest";
		private static CONTENT_TYPES_FILENAME: string = "[Content_Types].xml";
		
		/**
		 * List of known file types to use in the [Content_Types].xml file in the VSIX package.
		 */
		private static CONTENT_TYPE_MAP: {[key: string]: string} = {
			txt: "text/plain",
			pkgdef: "text/plain",
			xml: "text/xml",
			vsixmanifest: "text/xml",
			vsomanifest: "application/json",
			json: "application/json",
			htm: "text/html",
			html: "text/html",
			rtf: "application/rtf",
			pdf: "application/pdf",
			gif: "image/gif",
			jpg: "image/jpg",
			jpeg: "image/jpg",
			tiff: "image/tiff",
			vsix: "application/zip",
			zip: "application/zip",
			dll: "application/octet-stream"
		};
		
		/**
		 * constructor
		 * @param any vsoManifest JS Object representing a vso manifest
		 * @param any vsixManifest JS Object representing the XML for a vsix manifest
		 */
		constructor(vsoManifest: any, vsixManifest: any) {
			this.vsoManifest = vsoManifest;
			this.vsixManifest = vsixManifest;
			this.prepManifests();
		}
		
		private prepManifests() {
			// Remove any vso manifest assets, then add the correct entry.
			var assets = _.get<any[]>(this.vsixManifest, "PackageManifest.Assets[0].Asset");
			if (assets) {
				_.remove(assets, (asset) => {
					return _.get(asset, "$.Type", "x").toLowerCase() === "microsoft.vso.manifest";
				});
			} else {
				assets = [];
				_.set<any, any>(this.vsixManifest, "PackageManifest.Assets[0].Asset[0]", assets);
			}
			
			assets.push({$:{
				Type: "Microsoft.VSO.Manifest",
				Path: VsixWriter.VSO_MANIFEST_FILENAME
			}});
		}
		
		/**
		 * Write a vsix package to the given file name
		 * @param stream.Writable Stream to write the vsix package
		 */
		public writeVsix(outPath: string): Q.Promise<any> {
			var vsix = new zip();
			var root = this.vsoManifest.__meta_root;
			if (!root) {
				throw "Manifest root unknown. Manifest objects should have a __meta_root key specifying the absolute path to the root of assets.";
			}
			
			// Add assets to vsix archive
			var assets = <any[]>_.get(this.vsixManifest, "PackageManifest.Assets[0].Asset");
			if (_.isArray(assets)) {
				assets.forEach((asset) => {
					if (asset.$) {
						if (asset.$.Type === "Microsoft.VSO.Manifest") {
							return; // skip the vsomanifest, it is added later.
						}
						vsix.file((<string>asset.$.Path).replace(/\\/g, "/"), fs.readFileSync(path.join(root, asset.$.Path)));
					}
				});
			}
			
			// Write the manifests to a temporary path and add them to the zip
			return Q.Promise<string>((resolve, reject, notify) => {
				tmp.dir({unsafeCleanup: true}, (err, tmpPath, cleanupCallback) => {
					if (err) {
						reject(err);
					}
					resolve(tmpPath);
				});
			}).then((tmpPath) => {
				var manifestWriter = new ManifestWriter(this.vsoManifest, this.vsixManifest);
				var vsoPath = path.join(tmpPath, VsixWriter.VSO_MANIFEST_FILENAME);
				var vsixPath = path.join(tmpPath, VsixWriter.VSIX_MANIFEST_FILENAME);
				var vsoStr = fs.createWriteStream(vsoPath);
				var vsixStr = fs.createWriteStream(vsixPath);
				return manifestWriter.writeManifests(vsoStr, vsixStr).then(() => {
					vsix.file(VsixWriter.VSO_MANIFEST_FILENAME, fs.readFileSync(vsoPath, "utf-8"));
					vsix.file(VsixWriter.VSIX_MANIFEST_FILENAME, fs.readFileSync(vsixPath, "utf-8"));
				});
			}).then(() => {
				vsix.file(VsixWriter.CONTENT_TYPES_FILENAME, this.genContentTypesXml(Object.keys(vsix.files)));
				var buffer = vsix.generate({
					type: "nodebuffer",
					compression: "DEFLATE",
					compressionOptions: { level: 9 },
					platform: process.platform
				});
				fs.writeFile(outPath, buffer);
			});
				
		}
		
		/**
		 * Generates the required [Content_Types].xml file for the vsix package.
		 * This xml contains a <Default> entry for each different file extension
		 * found in the package, mapping it to the appropriate MIME type.
		 */
		private genContentTypesXml(fileNames: string[]): string {
			var contentTypes: any = {
				Types: {
					$: {
						xmlns: "http://schemas.openxmlformats.org/package/2006/content-types"
					},
					Default: []
				}
			};
			var uniqueExtensions = _.unique<string>(fileNames.map(f => _.trimLeft(path.extname(f))));
			uniqueExtensions.forEach((ext) => {
				var type = VsixWriter.CONTENT_TYPE_MAP[ext];
				if (!type) {
					type = "application/octet-stream";
				}
				contentTypes.Types.Default.push({
					$: {
						Extension: ext,
						ContentType: type
					}
				});
			});
			var builder = new xml.Builder({
				indent: "    ",
				newline: require("os").EOL,
				pretty: true,
				xmldec: {
					encoding: "utf-8",
					standalone: null,
					version: "1.0"
				}
			});
			return builder.buildObject(contentTypes);
		}
	}
	
	/**
	 * Class to help writing the vso manifest and vsix manifest
	 */
	export class ManifestWriter {
		private vsoManifest: any;
		private vsixManifest: any;
		
		/**
		 * constructor
		 * @param any vsoManifest JS Object representing a vso manifest
		 * @param any vsixManifest JS Object representing the XML for a vsix manifest
		 */
		constructor(vsoManifest: any, vsixManifest: any) {
			this.vsoManifest = this.removeMetaKeys(vsoManifest);
			this.vsixManifest = this.removeMetaKeys(vsixManifest);
		}
		
		private removeMetaKeys(obj: any): any {
			return _.omit(obj, (v, k) => {
				return _.startsWith(k, "__meta_");
			});
		}
		
		/**
		 * Writes the vso manifest and vsix manifest to given streams and ends the streams.
		 * @param stream.Writable Stream to write the vso manifest (json)
		 * @param stream.Writable Stream to write the vsix manifest (xml)
		 * @return Q.Promise<any> A promise that is resolved when the streams have been written/ended
		 */
		public writeManifests(vsoStream: stream.Writable, vsixStream: stream.Writable): Q.Promise<any> {
			
			var vsoPromise = Q.ninvoke(vsoStream, "write", JSON.stringify(this.vsoManifest, null, 4), "utf-8");
			vsoPromise = vsoPromise.then(() => {
				vsoStream.end();
			}).catch(console.error.bind(console));
			
			var builder = new xml.Builder({
				indent: "    ",
				newline: require("os").EOL,
				pretty: true,
				xmldec: {
					encoding: "utf-8",
					standalone: null,
					version: "1.0"
				}
			});
			var vsix = builder.buildObject(this.vsixManifest);
			var vsixPromise = Q.ninvoke(vsixStream, "write", vsix, "utf8");
			vsixPromise = vsixPromise.then(() => {
				vsixStream.end();
			}).catch(console.error.bind(console));
			
			return Q.all([vsoPromise, vsixPromise]);
		}
	}
}