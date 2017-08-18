import appConfig from "./config";

const dirCache = {}

function stripSuffix(str, suffix) {
    if(str.endsWith(suffix))
        return stripSuffix(str.slice(0, -suffix.length))
    else
        return str;
}

function stripPrefix(str, prefix) {
    if(str.startsWith(prefix))
        return stripPrefix(str.slice(prefix.length))
    else
        return str;
}

function stripSlashes(str) {
    return stripSuffix(stripPrefix(str, "/"), "/")
}

function stripDir(f, parent) {
    return stripSlashes(f.startsWith(parent) ? f.slice(parent.length) : f);
}

function appendSlash(dir) {
    if(dir.endsWith("/")) return dir;
    else return dir + "/";
}

/**
 * Make sure path has slash at the beginning and no slash at the end
 * @param path
 */
function normalizePathSlashes(path) {
    const p = path.startsWith("/") ? path : "/" + path
    return stripSuffix(p, "/")
}

function splitPath(path) {
    const d = normalizePathSlashes(path)
    if(d == "/")
        return ["/", null]
    const lastSlash = path.lastIndexOf("/")
    if(lastSlash == 0)
        return ["/", path.slice(1)] //first-level dir
    else
        return [path.slice(0, lastSlash), path.slice(lastSlash + 1)]
}

const dirListCache = {}

const GalleryService = {
    list: function (dir) {
        if(dirListCache[dir]) {
            console.debug("Taking directory content from cache", dir)
            return Promise.resolve(dirListCache[dir])
        } else {
            console.debug("Retrieving directory content from S3", dir)
            const s3 = new AWS.S3();
            const d = appConfig.galleryFolder + appendSlash(dir)
            return new Promise(function (resolve, reject) {
                s3.listObjects({
                    Bucket: appConfig.galleryBucket,
                    Prefix: d,
                    Delimiter: "/"
                }, function (err, res) {
                    if (err) reject(err)
                    else {
                        // console.log("result", res)
                        if (res.IsTruncated) console.warn("s3 response truncated, application doesn't handle it yet")
                        const ret = {
                            folders: res.CommonPrefixes.map(p => stripDir(p.Prefix, d)).filter(f => f.length > 0).sort(),
                            files: res.Contents.map(f => stripDir(f.Key, d)).filter(f => f.length > 0).sort()
                        }
                        dirListCache[dir] = ret;
                        resolve(ret)
                    }
                })
            })
        }
    },

    //deprecated - use distributionUrl and cookies instead
    preSign: function(dir, file) {
        const s3 = new AWS.S3();
        const key = appConfig.galleryFolder + appendSlash(dir) + file;
        const url = s3.getSignedUrl("getObject", {Bucket: appConfig.galleryBucket, Key: key, Expires: appConfig.linkExpirationTimeout});
        console.log("presigned url", dir, file, url);
        return url;
    },

    distributionUrl: function(dir, file) {
        return stripSuffix(appConfig.contentBaseUrl, "/") + appendSlash(dir) + file
    },

    thumbnailUrl: function(dir, file, w, h) {
        const query = "?w="+w+"&h="+h
        return stripSuffix(appConfig.thumbnailBaseUrl, "/") + appendSlash(dir) + file + query
    },

    lastChildDir: function(dir) {
        return GalleryService.list(dir).then(function(content) {
            if(content.folders.length == 0) {
                return dir
            } else {
                return GalleryService.lastChildDir(appendSlash(dir) + content.folders[content.folders.length - 1])
            }
        })
    },

    previousDir: function(dir) {
        const pathElements = splitPath(dir)
        console.log("Extracted parent", pathElements)
        if(!pathElements[1]) {
            console.debug("Root folder reached")
            return Promise.resolve(null)
        } else {
            return GalleryService.list(pathElements[0]).then(function (parentContent) {
                const currentIndex = parentContent.folders.indexOf(pathElements[1])
                console.log("ci", currentIndex)
                if(currentIndex < 0) {
                    console.warn("Directory not found in its parents content", pathElements, parentContent.folders)
                    return Promise.resolve(null)
                } else if (currentIndex == 0) {
                    console.debug("First dir reached, navigating to parent dir", pathElements[0])
                    return Promise.resolve(pathElements[0])
                } else {
                    const prev = stripSuffix(pathElements[0], "/") + "/" + parentContent.folders[currentIndex - 1]
                    return GalleryService.lastChildDir(prev)
                }
            })
        }
    },

    previousDirWithFiles: function(dir) {
        return GalleryService.previousDir(dir).then(function(prevDir) {
            if(!prevDir) {
                console.log("No prev dir", dir)
                return null
            } else {
                return GalleryService.list(prevDir).then(function (prevDirContent) {
                    if (prevDirContent.files.length == 0) {
                        console.log("0-len prev dir", dir, prevDir)
                        return GalleryService.previousDir(prevDir)
                    } else {
                        console.log("NZ-len prev dir", dir, prevDir)
                        return prevDir;
                    }
                })
            }
        })
    },

    previousFile: function(dir, file) {
        return GalleryService.list(dir).then(function(folderContent) {
            const currentIndex = folderContent.files.indexOf(file)
            if(currentIndex < 0) {
                console.warn("Current file not found in current folder, can't navigate", file, folderContent.files)
                return Promise.resolve(null)
            } else if(currentIndex == 0) {
                console.debug("First file in the directory, no backward navigation ATM")
                return GalleryService.previousDirWithFiles(dir).then(function (prevDir) {
                    console.debug("Previous dir found", dir, prevDir)
                    if(!prevDir)
                        return null;
                    else
                        return GalleryService.list(prevDir).then((prevDirContent) =>
                            ({folder: prevDir, file: prevDirContent.files[prevDirContent.files.length - 1]}))
                })
                return Promise.resolve(null)
            } else {
                return Promise.resolve({folder: dir, file: folderContent.files[currentIndex - 1]})
            }
        })
    },

    nextFile: function(dir, file) {
        return GalleryService.list(dir).then(function(folderContent) {
            const currentIndex = folderContent.files.indexOf(file)
            if(currentIndex < 0) {
                console.warn("Current file not found in current folder, can't navigate", file, folderContent.files)
                return Promise.resolve(null)
            } else if(currentIndex + 1 > folderContent.files.length - 1) {
                console.debug("Last file in the directory, no forward navigation ATM")
                return Promise.resolve(null)
            } else {
                return Promise.resolve({folder: dir, file: folderContent.files[currentIndex + 1]})
            }
        })
    }
}

export default GalleryService;
