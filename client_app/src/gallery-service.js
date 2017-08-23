import appConfig from "./config";

import U from "./utils";

const dirCache = {}


const dirListCache = {}

const GalleryService = {
    list: function (dir) {
        if(dirListCache[dir]) {
            console.debug("Taking directory content from cache", dir)
            return Promise.resolve(dirListCache[dir])
        } else {
            console.debug("Retrieving directory content from S3", dir)
            const s3 = new AWS.S3();
            const d = appConfig.galleryFolder + U.appendSlash(dir)
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
                            folders: res.CommonPrefixes.map(p => U.stripDir(p.Prefix, d)).filter(f => f.length > 0).sort(),
                            files: res.Contents.map(f => U.stripDir(f.Key, d)).filter(f => f.length > 0).sort()
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
        return U.stripSuffix(appConfig.contentBaseUrl, "/") + U.appendSlash(dir) + file
    },

    thumbnailUrl: function(dir, file, w, h) {
        const query = "?w="+w+"&h="+h
        return U.stripSuffix(appConfig.thumbnailBaseUrl, "/") + U.appendSlash(dir) + file + query
    },

    lastChildDir: function(dir) {
        return GalleryService.list(dir).then(function(content) {
            if(content.folders.length == 0) {
                return dir
            } else {
                return GalleryService.lastChildDir(U.appendSlash(dir) + content.folders[content.folders.length - 1])
            }
        })
    },

    nextClosestSibling: function(dir) {
        const pathElements = U.splitPath(dir)
        if(!pathElements[1])
            return null //Root reached
        else
            return GalleryService.list(pathElements[0]).then(function(parentContent) {
                const currentIndex = parentContent.folders.indexOf(pathElements[1])
                console.log("ci", currentIndex)
                if(currentIndex < 0) {
                    console.warn("Directory not found in its parents content", pathElements, parentContent.folders)
                    return null
                } else if (currentIndex == parentContent.folders.length - 1) {
                    console.debug("Last dir reached, navigating to parent's closest sibling", pathElements[0])
                    return GalleryService.nextClosestSibling(pathElements[0])
                } else {
                    return U.stripSuffix(pathElements[0], "/") + "/" + parentContent.folders[currentIndex + 1]
                }
            })
    },

    previousDir: function(dir) {
        const pathElements = U.splitPath(dir)
        console.debug("Extracted parent", pathElements)
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
                    const prev = U.appendSlash(pathElements[0]) + parentContent.folders[currentIndex - 1]
                    return GalleryService.lastChildDir(prev)
                }
            })
        }
    },

    nextDir: function(dir) {
        return GalleryService.list(dir).then(function (content) {
            if(content.folders.length == 0) {
                return GalleryService.nextClosestSibling(dir)
            } else {
                return U.appendSlash(dir) + content.folders[content.folders.length - 1]
            }
        })
    },

    previousDirWithFiles: function(dir) {
        return GalleryService.previousDir(dir).then(function(prevDir) {
            if(!prevDir) {
                console.debug("No prev dir", dir)
                return null
            } else {
                return GalleryService.list(prevDir).then(function (prevDirContent) {
                    if (prevDirContent.files.length == 0) {
                        console.debug("0-len prev dir", dir, prevDir)
                        return GalleryService.previousDirWithFiles(prevDir)
                    } else {
                        console.debug("NZ-len prev dir", dir, prevDir)
                        return prevDir;
                    }
                })
            }
        })
    },

    nextDirWithFiles: function(dir) {
        return GalleryService.nextDir(dir).then(function(nextDir) {
            if(!nextDir)
                return null;
            else
                return GalleryService.list(nextDir).then((nextDirCotent) =>
                    nextDirCotent.files.length == 0 ? GalleryService.nextDir(nextDir) : nextDir
                )

        })

    },

    previousFile: function(dir, file) {
        return GalleryService.list(dir).then(function(folderContent) {
            const currentIndex = folderContent.files.indexOf(file)
            if(currentIndex < 0) {
                console.warn("Current file not found in current folder, can't navigate", file, folderContent.files)
                return Promise.resolve(null)
            } else if(currentIndex == 0) {
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
                return GalleryService.nextDirWithFiles(dir).then(function(nextDir) {
                    if(!nextDir)
                        return null
                    else
                        return GalleryService.list(nextDir).then((nextDirContent) =>
                            ({folder: nextDir, file: nextDirContent.files[0]})
                        )
                })
            } else {
                return Promise.resolve({folder: dir, file: folderContent.files[currentIndex + 1]})
            }
        })
    }
}

export default GalleryService;
