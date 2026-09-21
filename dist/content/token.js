(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/jszip/dist/jszip.min.js
  var require_jszip_min = __commonJS({
    "node_modules/jszip/dist/jszip.min.js"(exports, module) {
      !(function(e) {
        if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();
        else if ("function" == typeof define && define.amd) define([], e);
        else {
          ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = e();
        }
      })(function() {
        return (function s(a, o, h) {
          function u(r, e2) {
            if (!o[r]) {
              if (!a[r]) {
                var t = "function" == typeof __require && __require;
                if (!e2 && t) return t(r, true);
                if (l) return l(r, true);
                var n = new Error("Cannot find module '" + r + "'");
                throw n.code = "MODULE_NOT_FOUND", n;
              }
              var i = o[r] = { exports: {} };
              a[r][0].call(i.exports, function(e3) {
                var t2 = a[r][1][e3];
                return u(t2 || e3);
              }, i, i.exports, s, a, o, h);
            }
            return o[r].exports;
          }
          for (var l = "function" == typeof __require && __require, e = 0; e < h.length; e++) u(h[e]);
          return u;
        })({ 1: [function(e, t, r) {
          "use strict";
          var d = e("./utils"), c = e("./support"), p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
          r.encode = function(e2) {
            for (var t2, r2, n, i, s, a, o, h = [], u = 0, l = e2.length, f = l, c2 = "string" !== d.getTypeOf(e2); u < e2.length; ) f = l - u, n = c2 ? (t2 = e2[u++], r2 = u < l ? e2[u++] : 0, u < l ? e2[u++] : 0) : (t2 = e2.charCodeAt(u++), r2 = u < l ? e2.charCodeAt(u++) : 0, u < l ? e2.charCodeAt(u++) : 0), i = t2 >> 2, s = (3 & t2) << 4 | r2 >> 4, a = 1 < f ? (15 & r2) << 2 | n >> 6 : 64, o = 2 < f ? 63 & n : 64, h.push(p.charAt(i) + p.charAt(s) + p.charAt(a) + p.charAt(o));
            return h.join("");
          }, r.decode = function(e2) {
            var t2, r2, n, i, s, a, o = 0, h = 0, u = "data:";
            if (e2.substr(0, u.length) === u) throw new Error("Invalid base64 input, it looks like a data url.");
            var l, f = 3 * (e2 = e2.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
            if (e2.charAt(e2.length - 1) === p.charAt(64) && f--, e2.charAt(e2.length - 2) === p.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
            for (l = c.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); o < e2.length; ) t2 = p.indexOf(e2.charAt(o++)) << 2 | (i = p.indexOf(e2.charAt(o++))) >> 4, r2 = (15 & i) << 4 | (s = p.indexOf(e2.charAt(o++))) >> 2, n = (3 & s) << 6 | (a = p.indexOf(e2.charAt(o++))), l[h++] = t2, 64 !== s && (l[h++] = r2), 64 !== a && (l[h++] = n);
            return l;
          };
        }, { "./support": 30, "./utils": 32 }], 2: [function(e, t, r) {
          "use strict";
          var n = e("./external"), i = e("./stream/DataWorker"), s = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
          function o(e2, t2, r2, n2, i2) {
            this.compressedSize = e2, this.uncompressedSize = t2, this.crc32 = r2, this.compression = n2, this.compressedContent = i2;
          }
          o.prototype = { getContentWorker: function() {
            var e2 = new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t2 = this;
            return e2.on("end", function() {
              if (this.streamInfo.data_length !== t2.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
            }), e2;
          }, getCompressedWorker: function() {
            return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
          } }, o.createWorkerFrom = function(e2, t2, r2) {
            return e2.pipe(new s()).pipe(new a("uncompressedSize")).pipe(t2.compressWorker(r2)).pipe(new a("compressedSize")).withStreamInfo("compression", t2);
          }, t.exports = o;
        }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, t, r) {
          "use strict";
          var n = e("./stream/GenericWorker");
          r.STORE = { magic: "\0\0", compressWorker: function() {
            return new n("STORE compression");
          }, uncompressWorker: function() {
            return new n("STORE decompression");
          } }, r.DEFLATE = e("./flate");
        }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, t, r) {
          "use strict";
          var n = e("./utils");
          var o = (function() {
            for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
              e2 = r2;
              for (var n2 = 0; n2 < 8; n2++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
              t2[r2] = e2;
            }
            return t2;
          })();
          t.exports = function(e2, t2) {
            return void 0 !== e2 && e2.length ? "string" !== n.getTypeOf(e2) ? (function(e3, t3, r2, n2) {
              var i = o, s = n2 + r2;
              e3 ^= -1;
              for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3[a])];
              return -1 ^ e3;
            })(0 | t2, e2, e2.length, 0) : (function(e3, t3, r2, n2) {
              var i = o, s = n2 + r2;
              e3 ^= -1;
              for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3.charCodeAt(a))];
              return -1 ^ e3;
            })(0 | t2, e2, e2.length, 0) : 0;
          };
        }, { "./utils": 32 }], 5: [function(e, t, r) {
          "use strict";
          r.base64 = false, r.binary = false, r.dir = false, r.createFolders = true, r.date = null, r.compression = null, r.compressionOptions = null, r.comment = null, r.unixPermissions = null, r.dosPermissions = null;
        }, {}], 6: [function(e, t, r) {
          "use strict";
          var n = null;
          n = "undefined" != typeof Promise ? Promise : e("lie"), t.exports = { Promise: n };
        }, { lie: 37 }], 7: [function(e, t, r) {
          "use strict";
          var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, i = e("pako"), s = e("./utils"), a = e("./stream/GenericWorker"), o = n ? "uint8array" : "array";
          function h(e2, t2) {
            a.call(this, "FlateWorker/" + e2), this._pako = null, this._pakoAction = e2, this._pakoOptions = t2, this.meta = {};
          }
          r.magic = "\b\0", s.inherits(h, a), h.prototype.processChunk = function(e2) {
            this.meta = e2.meta, null === this._pako && this._createPako(), this._pako.push(s.transformTo(o, e2.data), false);
          }, h.prototype.flush = function() {
            a.prototype.flush.call(this), null === this._pako && this._createPako(), this._pako.push([], true);
          }, h.prototype.cleanUp = function() {
            a.prototype.cleanUp.call(this), this._pako = null;
          }, h.prototype._createPako = function() {
            this._pako = new i[this._pakoAction]({ raw: true, level: this._pakoOptions.level || -1 });
            var t2 = this;
            this._pako.onData = function(e2) {
              t2.push({ data: e2, meta: t2.meta });
            };
          }, r.compressWorker = function(e2) {
            return new h("Deflate", e2);
          }, r.uncompressWorker = function() {
            return new h("Inflate", {});
          };
        }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, t, r) {
          "use strict";
          function A(e2, t2) {
            var r2, n2 = "";
            for (r2 = 0; r2 < t2; r2++) n2 += String.fromCharCode(255 & e2), e2 >>>= 8;
            return n2;
          }
          function n(e2, t2, r2, n2, i2, s2) {
            var a, o, h = e2.file, u = e2.compression, l = s2 !== O.utf8encode, f = I.transformTo("string", s2(h.name)), c = I.transformTo("string", O.utf8encode(h.name)), d = h.comment, p = I.transformTo("string", s2(d)), m = I.transformTo("string", O.utf8encode(d)), _ = c.length !== h.name.length, g = m.length !== d.length, b = "", v = "", y = "", w = h.dir, k = h.date, x = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
            t2 && !r2 || (x.crc32 = e2.crc32, x.compressedSize = e2.compressedSize, x.uncompressedSize = e2.uncompressedSize);
            var S = 0;
            t2 && (S |= 8), l || !_ && !g || (S |= 2048);
            var z = 0, C = 0;
            w && (z |= 16), "UNIX" === i2 ? (C = 798, z |= (function(e3, t3) {
              var r3 = e3;
              return e3 || (r3 = t3 ? 16893 : 33204), (65535 & r3) << 16;
            })(h.unixPermissions, w)) : (C = 20, z |= (function(e3) {
              return 63 & (e3 || 0);
            })(h.dosPermissions)), a = k.getUTCHours(), a <<= 6, a |= k.getUTCMinutes(), a <<= 5, a |= k.getUTCSeconds() / 2, o = k.getUTCFullYear() - 1980, o <<= 4, o |= k.getUTCMonth() + 1, o <<= 5, o |= k.getUTCDate(), _ && (v = A(1, 1) + A(B(f), 4) + c, b += "up" + A(v.length, 2) + v), g && (y = A(1, 1) + A(B(p), 4) + m, b += "uc" + A(y.length, 2) + y);
            var E = "";
            return E += "\n\0", E += A(S, 2), E += u.magic, E += A(a, 2), E += A(o, 2), E += A(x.crc32, 4), E += A(x.compressedSize, 4), E += A(x.uncompressedSize, 4), E += A(f.length, 2), E += A(b.length, 2), { fileRecord: R.LOCAL_FILE_HEADER + E + f + b, dirRecord: R.CENTRAL_FILE_HEADER + A(C, 2) + E + A(p.length, 2) + "\0\0\0\0" + A(z, 4) + A(n2, 4) + f + b + p };
          }
          var I = e("../utils"), i = e("../stream/GenericWorker"), O = e("../utf8"), B = e("../crc32"), R = e("../signature");
          function s(e2, t2, r2, n2) {
            i.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t2, this.zipPlatform = r2, this.encodeFileName = n2, this.streamFiles = e2, this.accumulate = false, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
          }
          I.inherits(s, i), s.prototype.push = function(e2) {
            var t2 = e2.meta.percent || 0, r2 = this.entriesCount, n2 = this._sources.length;
            this.accumulate ? this.contentBuffer.push(e2) : (this.bytesWritten += e2.data.length, i.prototype.push.call(this, { data: e2.data, meta: { currentFile: this.currentFile, percent: r2 ? (t2 + 100 * (r2 - n2 - 1)) / r2 : 100 } }));
          }, s.prototype.openedSource = function(e2) {
            this.currentSourceOffset = this.bytesWritten, this.currentFile = e2.file.name;
            var t2 = this.streamFiles && !e2.file.dir;
            if (t2) {
              var r2 = n(e2, t2, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
              this.push({ data: r2.fileRecord, meta: { percent: 0 } });
            } else this.accumulate = true;
          }, s.prototype.closedSource = function(e2) {
            this.accumulate = false;
            var t2 = this.streamFiles && !e2.file.dir, r2 = n(e2, t2, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            if (this.dirRecords.push(r2.dirRecord), t2) this.push({ data: (function(e3) {
              return R.DATA_DESCRIPTOR + A(e3.crc32, 4) + A(e3.compressedSize, 4) + A(e3.uncompressedSize, 4);
            })(e2), meta: { percent: 100 } });
            else for (this.push({ data: r2.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
            this.currentFile = null;
          }, s.prototype.flush = function() {
            for (var e2 = this.bytesWritten, t2 = 0; t2 < this.dirRecords.length; t2++) this.push({ data: this.dirRecords[t2], meta: { percent: 100 } });
            var r2 = this.bytesWritten - e2, n2 = (function(e3, t3, r3, n3, i2) {
              var s2 = I.transformTo("string", i2(n3));
              return R.CENTRAL_DIRECTORY_END + "\0\0\0\0" + A(e3, 2) + A(e3, 2) + A(t3, 4) + A(r3, 4) + A(s2.length, 2) + s2;
            })(this.dirRecords.length, r2, e2, this.zipComment, this.encodeFileName);
            this.push({ data: n2, meta: { percent: 100 } });
          }, s.prototype.prepareNextSource = function() {
            this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
          }, s.prototype.registerPrevious = function(e2) {
            this._sources.push(e2);
            var t2 = this;
            return e2.on("data", function(e3) {
              t2.processChunk(e3);
            }), e2.on("end", function() {
              t2.closedSource(t2.previous.streamInfo), t2._sources.length ? t2.prepareNextSource() : t2.end();
            }), e2.on("error", function(e3) {
              t2.error(e3);
            }), this;
          }, s.prototype.resume = function() {
            return !!i.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), true) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), true));
          }, s.prototype.error = function(e2) {
            var t2 = this._sources;
            if (!i.prototype.error.call(this, e2)) return false;
            for (var r2 = 0; r2 < t2.length; r2++) try {
              t2[r2].error(e2);
            } catch (e3) {
            }
            return true;
          }, s.prototype.lock = function() {
            i.prototype.lock.call(this);
            for (var e2 = this._sources, t2 = 0; t2 < e2.length; t2++) e2[t2].lock();
          }, t.exports = s;
        }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, t, r) {
          "use strict";
          var u = e("../compressions"), n = e("./ZipFileWorker");
          r.generateWorker = function(e2, a, t2) {
            var o = new n(a.streamFiles, t2, a.platform, a.encodeFileName), h = 0;
            try {
              e2.forEach(function(e3, t3) {
                h++;
                var r2 = (function(e4, t4) {
                  var r3 = e4 || t4, n3 = u[r3];
                  if (!n3) throw new Error(r3 + " is not a valid compression method !");
                  return n3;
                })(t3.options.compression, a.compression), n2 = t3.options.compressionOptions || a.compressionOptions || {}, i = t3.dir, s = t3.date;
                t3._compressWorker(r2, n2).withStreamInfo("file", { name: e3, dir: i, date: s, comment: t3.comment || "", unixPermissions: t3.unixPermissions, dosPermissions: t3.dosPermissions }).pipe(o);
              }), o.entriesCount = h;
            } catch (e3) {
              o.error(e3);
            }
            return o;
          };
        }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(e, t, r) {
          "use strict";
          function n() {
            if (!(this instanceof n)) return new n();
            if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
            this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
              var e2 = new n();
              for (var t2 in this) "function" != typeof this[t2] && (e2[t2] = this[t2]);
              return e2;
            };
          }
          (n.prototype = e("./object")).loadAsync = e("./load"), n.support = e("./support"), n.defaults = e("./defaults"), n.version = "3.10.2", n.loadAsync = function(e2, t2) {
            return new n().loadAsync(e2, t2);
          }, n.external = e("./external"), t.exports = n;
        }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(e, t, r) {
          "use strict";
          var u = e("./utils"), i = e("./external"), n = e("./utf8"), s = e("./zipEntries"), a = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
          function f(n2) {
            return new i.Promise(function(e2, t2) {
              var r2 = n2.decompressed.getContentWorker().pipe(new a());
              r2.on("error", function(e3) {
                t2(e3);
              }).on("end", function() {
                r2.streamInfo.crc32 !== n2.decompressed.crc32 ? t2(new Error("Corrupted zip : CRC32 mismatch")) : e2();
              }).resume();
            });
          }
          t.exports = function(e2, o) {
            var h = this;
            return o = u.extend(o || {}, { base64: false, checkCRC32: false, optimizedBinaryString: false, createFolders: false, decodeFileName: n.utf8decode }), l.isNode && l.isStream(e2) ? i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : u.prepareContent("the loaded zip file", e2, true, o.optimizedBinaryString, o.base64).then(function(e3) {
              var t2 = new s(o);
              return t2.load(e3), t2;
            }).then(function(e3) {
              var t2 = [i.Promise.resolve(e3)], r2 = e3.files;
              if (o.checkCRC32) for (var n2 = 0; n2 < r2.length; n2++) t2.push(f(r2[n2]));
              return i.Promise.all(t2);
            }).then(function(e3) {
              for (var t2 = e3.shift(), r2 = t2.files, n2 = 0; n2 < r2.length; n2++) {
                var i2 = r2[n2], s2 = i2.fileNameStr, a2 = u.resolve(i2.fileNameStr);
                h.file(a2, i2.decompressed, { binary: true, optimizedBinaryString: true, date: i2.date, dir: i2.dir, comment: i2.fileCommentStr.length ? i2.fileCommentStr : null, unixPermissions: i2.unixPermissions, dosPermissions: i2.dosPermissions, createFolders: o.createFolders }), i2.dir || (h.file(a2).unsafeOriginalName = s2);
              }
              return t2.zipComment.length && (h.comment = t2.zipComment), h;
            });
          };
        }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, t, r) {
          "use strict";
          var n = e("../utils"), i = e("../stream/GenericWorker");
          function s(e2, t2) {
            i.call(this, "Nodejs stream input adapter for " + e2), this._upstreamEnded = false, this._bindStream(t2);
          }
          n.inherits(s, i), s.prototype._bindStream = function(e2) {
            var t2 = this;
            (this._stream = e2).pause(), e2.on("data", function(e3) {
              t2.push({ data: e3, meta: { percent: 0 } });
            }).on("error", function(e3) {
              t2.isPaused ? this.generatedError = e3 : t2.error(e3);
            }).on("end", function() {
              t2.isPaused ? t2._upstreamEnded = true : t2.end();
            });
          }, s.prototype.pause = function() {
            return !!i.prototype.pause.call(this) && (this._stream.pause(), true);
          }, s.prototype.resume = function() {
            return !!i.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), true);
          }, t.exports = s;
        }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, t, r) {
          "use strict";
          var i = e("readable-stream").Readable;
          function n(e2, t2, r2) {
            i.call(this, t2), this._helper = e2;
            var n2 = this;
            e2.on("data", function(e3, t3) {
              n2.push(e3) || n2._helper.pause(), r2 && r2(t3);
            }).on("error", function(e3) {
              n2.emit("error", e3);
            }).on("end", function() {
              n2.push(null);
            });
          }
          e("../utils").inherits(n, i), n.prototype._read = function() {
            this._helper.resume();
          }, t.exports = n;
        }, { "../utils": 32, "readable-stream": 16 }], 14: [function(e, t, r) {
          "use strict";
          t.exports = { isNode: "undefined" != typeof Buffer, newBufferFrom: function(e2, t2) {
            if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e2, t2);
            if ("number" == typeof e2) throw new Error('The "data" argument must not be a number');
            return new Buffer(e2, t2);
          }, allocBuffer: function(e2) {
            if (Buffer.alloc) return Buffer.alloc(e2);
            var t2 = new Buffer(e2);
            return t2.fill(0), t2;
          }, isBuffer: function(e2) {
            return Buffer.isBuffer(e2);
          }, isStream: function(e2) {
            return e2 && "function" == typeof e2.on && "function" == typeof e2.pause && "function" == typeof e2.resume;
          } };
        }, {}], 15: [function(e, t, r) {
          "use strict";
          function s(e2, t2, r2) {
            var n2, i2 = u.getTypeOf(t2), s2 = u.extend(r2 || {}, f);
            s2.date = s2.date || /* @__PURE__ */ new Date(), null !== s2.compression && (s2.compression = s2.compression.toUpperCase()), "string" == typeof s2.unixPermissions && (s2.unixPermissions = parseInt(s2.unixPermissions, 8)), s2.unixPermissions && 16384 & s2.unixPermissions && (s2.dir = true), s2.dosPermissions && 16 & s2.dosPermissions && (s2.dir = true), s2.dir && (e2 = g(e2)), s2.createFolders && (n2 = _(e2)) && b.call(this, n2, true);
            var a2 = "string" === i2 && false === s2.binary && false === s2.base64;
            r2 && void 0 !== r2.binary || (s2.binary = !a2), (t2 instanceof c && 0 === t2.uncompressedSize || s2.dir || !t2 || 0 === t2.length) && (s2.base64 = false, s2.binary = true, t2 = "", s2.compression = "STORE", i2 = "string");
            var o2 = null;
            o2 = t2 instanceof c || t2 instanceof l ? t2 : p.isNode && p.isStream(t2) ? new m(e2, t2) : u.prepareContent(e2, t2, s2.binary, s2.optimizedBinaryString, s2.base64);
            var h2 = new d(e2, o2, s2);
            this.files[e2] = h2;
          }
          var i = e("./utf8"), u = e("./utils"), l = e("./stream/GenericWorker"), a = e("./stream/StreamHelper"), f = e("./defaults"), c = e("./compressedObject"), d = e("./zipObject"), o = e("./generate"), p = e("./nodejsUtils"), m = e("./nodejs/NodejsStreamInputAdapter"), _ = function(e2) {
            "/" === e2.slice(-1) && (e2 = e2.substring(0, e2.length - 1));
            var t2 = e2.lastIndexOf("/");
            return 0 < t2 ? e2.substring(0, t2) : "";
          }, g = function(e2) {
            return "/" !== e2.slice(-1) && (e2 += "/"), e2;
          }, b = function(e2, t2) {
            return t2 = void 0 !== t2 ? t2 : f.createFolders, e2 = g(e2), this.files[e2] || s.call(this, e2, null, { dir: true, createFolders: t2 }), this.files[e2];
          };
          function h(e2) {
            return "[object RegExp]" === Object.prototype.toString.call(e2);
          }
          var n = { load: function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
          }, forEach: function(e2) {
            var t2, r2, n2;
            for (t2 in this.files) n2 = this.files[t2], (r2 = t2.slice(this.root.length, t2.length)) && t2.slice(0, this.root.length) === this.root && e2(r2, n2);
          }, filter: function(r2) {
            var n2 = [];
            return this.forEach(function(e2, t2) {
              r2(e2, t2) && n2.push(t2);
            }), n2;
          }, file: function(e2, t2, r2) {
            if (1 !== arguments.length) return e2 = this.root + e2, s.call(this, e2, t2, r2), this;
            if (h(e2)) {
              var n2 = e2;
              return this.filter(function(e3, t3) {
                return !t3.dir && n2.test(e3);
              });
            }
            var i2 = this.files[this.root + e2];
            return i2 && !i2.dir ? i2 : null;
          }, folder: function(r2) {
            if (!r2) return this;
            if (h(r2)) return this.filter(function(e3, t3) {
              return t3.dir && r2.test(e3);
            });
            var e2 = this.root + r2, t2 = b.call(this, e2), n2 = this.clone();
            return n2.root = t2.name, n2;
          }, remove: function(r2) {
            r2 = this.root + r2;
            var e2 = this.files[r2];
            if (e2 || ("/" !== r2.slice(-1) && (r2 += "/"), e2 = this.files[r2]), e2 && !e2.dir) delete this.files[r2];
            else for (var t2 = this.filter(function(e3, t3) {
              return t3.name.slice(0, r2.length) === r2;
            }), n2 = 0; n2 < t2.length; n2++) delete this.files[t2[n2].name];
            return this;
          }, generate: function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
          }, generateInternalStream: function(e2) {
            var t2, r2 = {};
            try {
              if ((r2 = u.extend(e2 || {}, { streamFiles: false, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: i.utf8encode })).type = r2.type.toLowerCase(), r2.compression = r2.compression.toUpperCase(), "binarystring" === r2.type && (r2.type = "string"), !r2.type) throw new Error("No output type specified.");
              u.checkSupport(r2.type), "darwin" !== r2.platform && "freebsd" !== r2.platform && "linux" !== r2.platform && "sunos" !== r2.platform || (r2.platform = "UNIX"), "win32" === r2.platform && (r2.platform = "DOS");
              var n2 = r2.comment || this.comment || "";
              t2 = o.generateWorker(this, r2, n2);
            } catch (e3) {
              (t2 = new l("error")).error(e3);
            }
            return new a(t2, r2.type || "string", r2.mimeType);
          }, generateAsync: function(e2, t2) {
            return this.generateInternalStream(e2).accumulate(t2);
          }, generateNodeStream: function(e2, t2) {
            return (e2 = e2 || {}).type || (e2.type = "nodebuffer"), this.generateInternalStream(e2).toNodejsStream(t2);
          } };
          t.exports = n;
        }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, t, r) {
          "use strict";
          t.exports = e("stream");
        }, { stream: void 0 }], 17: [function(e, t, r) {
          "use strict";
          var n = e("./DataReader");
          function i(e2) {
            n.call(this, e2);
            for (var t2 = 0; t2 < this.data.length; t2++) e2[t2] = 255 & e2[t2];
          }
          e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
            return this.data[this.zero + e2];
          }, i.prototype.lastIndexOfSignature = function(e2) {
            for (var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.length - 4; 0 <= s; --s) if (this.data[s] === t2 && this.data[s + 1] === r2 && this.data[s + 2] === n2 && this.data[s + 3] === i2) return s - this.zero;
            return -1;
          }, i.prototype.readAndCheckSignature = function(e2) {
            var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.readData(4);
            return t2 === s[0] && r2 === s[1] && n2 === s[2] && i2 === s[3];
          }, i.prototype.readData = function(e2) {
            if (this.checkOffset(e2), 0 === e2) return [];
            var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
            return this.index += e2, t2;
          }, t.exports = i;
        }, { "../utils": 32, "./DataReader": 18 }], 18: [function(e, t, r) {
          "use strict";
          var n = e("../utils");
          function i(e2) {
            this.data = e2, this.length = e2.length, this.index = 0, this.zero = 0;
          }
          i.prototype = { checkOffset: function(e2) {
            this.checkIndex(this.index + e2);
          }, checkIndex: function(e2) {
            if (this.length < this.zero + e2 || e2 < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + e2 + "). Corrupted zip ?");
          }, setIndex: function(e2) {
            this.checkIndex(e2), this.index = e2;
          }, skip: function(e2) {
            this.setIndex(this.index + e2);
          }, byteAt: function() {
          }, readInt: function(e2) {
            var t2, r2 = 0;
            for (this.checkOffset(e2), t2 = this.index + e2 - 1; t2 >= this.index; t2--) r2 = (r2 << 8) + this.byteAt(t2);
            return this.index += e2, r2;
          }, readString: function(e2) {
            return n.transformTo("string", this.readData(e2));
          }, readData: function() {
          }, lastIndexOfSignature: function() {
          }, readAndCheckSignature: function() {
          }, readDate: function() {
            var e2 = this.readInt(4);
            return new Date(Date.UTC(1980 + (e2 >> 25 & 127), (e2 >> 21 & 15) - 1, e2 >> 16 & 31, e2 >> 11 & 31, e2 >> 5 & 63, (31 & e2) << 1));
          } }, t.exports = i;
        }, { "../utils": 32 }], 19: [function(e, t, r) {
          "use strict";
          var n = e("./Uint8ArrayReader");
          function i(e2) {
            n.call(this, e2);
          }
          e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
            this.checkOffset(e2);
            var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
            return this.index += e2, t2;
          }, t.exports = i;
        }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(e, t, r) {
          "use strict";
          var n = e("./DataReader");
          function i(e2) {
            n.call(this, e2);
          }
          e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
            return this.data.charCodeAt(this.zero + e2);
          }, i.prototype.lastIndexOfSignature = function(e2) {
            return this.data.lastIndexOf(e2) - this.zero;
          }, i.prototype.readAndCheckSignature = function(e2) {
            return e2 === this.readData(4);
          }, i.prototype.readData = function(e2) {
            this.checkOffset(e2);
            var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
            return this.index += e2, t2;
          }, t.exports = i;
        }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, t, r) {
          "use strict";
          var n = e("./ArrayReader");
          function i(e2) {
            n.call(this, e2);
          }
          e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
            if (this.checkOffset(e2), 0 === e2) return new Uint8Array(0);
            var t2 = this.data.subarray(this.zero + this.index, this.zero + this.index + e2);
            return this.index += e2, t2;
          }, t.exports = i;
        }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, t, r) {
          "use strict";
          var n = e("../utils"), i = e("../support"), s = e("./ArrayReader"), a = e("./StringReader"), o = e("./NodeBufferReader"), h = e("./Uint8ArrayReader");
          t.exports = function(e2) {
            var t2 = n.getTypeOf(e2);
            return n.checkSupport(t2), "string" !== t2 || i.uint8array ? "nodebuffer" === t2 ? new o(e2) : i.uint8array ? new h(n.transformTo("uint8array", e2)) : new s(n.transformTo("array", e2)) : new a(e2);
          };
        }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, t, r) {
          "use strict";
          r.LOCAL_FILE_HEADER = "PK", r.CENTRAL_FILE_HEADER = "PK", r.CENTRAL_DIRECTORY_END = "PK", r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", r.ZIP64_CENTRAL_DIRECTORY_END = "PK", r.DATA_DESCRIPTOR = "PK\x07\b";
        }, {}], 24: [function(e, t, r) {
          "use strict";
          var n = e("./GenericWorker"), i = e("../utils");
          function s(e2) {
            n.call(this, "ConvertWorker to " + e2), this.destType = e2;
          }
          i.inherits(s, n), s.prototype.processChunk = function(e2) {
            this.push({ data: i.transformTo(this.destType, e2.data), meta: e2.meta });
          }, t.exports = s;
        }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, t, r) {
          "use strict";
          var n = e("./GenericWorker"), i = e("../crc32");
          function s() {
            n.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
          }
          e("../utils").inherits(s, n), s.prototype.processChunk = function(e2) {
            this.streamInfo.crc32 = i(e2.data, this.streamInfo.crc32 || 0), this.push(e2);
          }, t.exports = s;
        }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, t, r) {
          "use strict";
          var n = e("../utils"), i = e("./GenericWorker");
          function s(e2) {
            i.call(this, "DataLengthProbe for " + e2), this.propName = e2, this.withStreamInfo(e2, 0);
          }
          n.inherits(s, i), s.prototype.processChunk = function(e2) {
            if (e2) {
              var t2 = this.streamInfo[this.propName] || 0;
              this.streamInfo[this.propName] = t2 + e2.data.length;
            }
            i.prototype.processChunk.call(this, e2);
          }, t.exports = s;
        }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, t, r) {
          "use strict";
          var n = e("../utils"), i = e("./GenericWorker");
          function s(e2) {
            i.call(this, "DataWorker");
            var t2 = this;
            this.dataIsReady = false, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = false, e2.then(function(e3) {
              t2.dataIsReady = true, t2.data = e3, t2.max = e3 && e3.length || 0, t2.type = n.getTypeOf(e3), t2.isPaused || t2._tickAndRepeat();
            }, function(e3) {
              t2.error(e3);
            });
          }
          n.inherits(s, i), s.prototype.cleanUp = function() {
            i.prototype.cleanUp.call(this), this.data = null;
          }, s.prototype.resume = function() {
            return !!i.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = true, n.delay(this._tickAndRepeat, [], this)), true);
          }, s.prototype._tickAndRepeat = function() {
            this._tickScheduled = false, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (n.delay(this._tickAndRepeat, [], this), this._tickScheduled = true));
          }, s.prototype._tick = function() {
            if (this.isPaused || this.isFinished) return false;
            var e2 = null, t2 = Math.min(this.max, this.index + 16384);
            if (this.index >= this.max) return this.end();
            switch (this.type) {
              case "string":
                e2 = this.data.substring(this.index, t2);
                break;
              case "uint8array":
                e2 = this.data.subarray(this.index, t2);
                break;
              case "array":
              case "nodebuffer":
                e2 = this.data.slice(this.index, t2);
            }
            return this.index = t2, this.push({ data: e2, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
          }, t.exports = s;
        }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(e, t, r) {
          "use strict";
          function n(e2) {
            this.name = e2 || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = true, this.isFinished = false, this.isLocked = false, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
          }
          n.prototype = { push: function(e2) {
            this.emit("data", e2);
          }, end: function() {
            if (this.isFinished) return false;
            this.flush();
            try {
              this.emit("end"), this.cleanUp(), this.isFinished = true;
            } catch (e2) {
              this.emit("error", e2);
            }
            return true;
          }, error: function(e2) {
            return !this.isFinished && (this.isPaused ? this.generatedError = e2 : (this.isFinished = true, this.emit("error", e2), this.previous && this.previous.error(e2), this.cleanUp()), true);
          }, on: function(e2, t2) {
            return this._listeners[e2].push(t2), this;
          }, cleanUp: function() {
            this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
          }, emit: function(e2, t2) {
            if (this._listeners[e2]) for (var r2 = 0; r2 < this._listeners[e2].length; r2++) this._listeners[e2][r2].call(this, t2);
          }, pipe: function(e2) {
            return e2.registerPrevious(this);
          }, registerPrevious: function(e2) {
            if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
            this.streamInfo = e2.streamInfo, this.mergeStreamInfo(), this.previous = e2;
            var t2 = this;
            return e2.on("data", function(e3) {
              t2.processChunk(e3);
            }), e2.on("end", function() {
              t2.end();
            }), e2.on("error", function(e3) {
              t2.error(e3);
            }), this;
          }, pause: function() {
            return !this.isPaused && !this.isFinished && (this.isPaused = true, this.previous && this.previous.pause(), true);
          }, resume: function() {
            if (!this.isPaused || this.isFinished) return false;
            var e2 = this.isPaused = false;
            return this.generatedError && (this.error(this.generatedError), e2 = true), this.previous && this.previous.resume(), !e2;
          }, flush: function() {
          }, processChunk: function(e2) {
            this.push(e2);
          }, withStreamInfo: function(e2, t2) {
            return this.extraStreamInfo[e2] = t2, this.mergeStreamInfo(), this;
          }, mergeStreamInfo: function() {
            for (var e2 in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e2) && (this.streamInfo[e2] = this.extraStreamInfo[e2]);
          }, lock: function() {
            if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
            this.isLocked = true, this.previous && this.previous.lock();
          }, toString: function() {
            var e2 = "Worker " + this.name;
            return this.previous ? this.previous + " -> " + e2 : e2;
          } }, t.exports = n;
        }, {}], 29: [function(e, t, r) {
          "use strict";
          var h = e("../utils"), i = e("./ConvertWorker"), s = e("./GenericWorker"), u = e("../base64"), n = e("../support"), a = e("../external"), o = null;
          if (n.nodestream) try {
            o = e("../nodejs/NodejsStreamOutputAdapter");
          } catch (e2) {
          }
          function l(e2, o2) {
            return new a.Promise(function(t2, r2) {
              var n2 = [], i2 = e2._internalType, s2 = e2._outputType, a2 = e2._mimeType;
              e2.on("data", function(e3, t3) {
                n2.push(e3), o2 && o2(t3);
              }).on("error", function(e3) {
                n2 = [], r2(e3);
              }).on("end", function() {
                try {
                  var e3 = (function(e4, t3, r3) {
                    switch (e4) {
                      case "blob":
                        return h.newBlob(h.transformTo("arraybuffer", t3), r3);
                      case "base64":
                        return u.encode(t3);
                      default:
                        return h.transformTo(e4, t3);
                    }
                  })(s2, (function(e4, t3) {
                    var r3, n3 = 0, i3 = null, s3 = 0;
                    for (r3 = 0; r3 < t3.length; r3++) s3 += t3[r3].length;
                    switch (e4) {
                      case "string":
                        return t3.join("");
                      case "array":
                        return Array.prototype.concat.apply([], t3);
                      case "uint8array":
                        for (i3 = new Uint8Array(s3), r3 = 0; r3 < t3.length; r3++) i3.set(t3[r3], n3), n3 += t3[r3].length;
                        return i3;
                      case "nodebuffer":
                        return Buffer.concat(t3);
                      default:
                        throw new Error("concat : unsupported type '" + e4 + "'");
                    }
                  })(i2, n2), a2);
                  t2(e3);
                } catch (e4) {
                  r2(e4);
                }
                n2 = [];
              }).resume();
            });
          }
          function f(e2, t2, r2) {
            var n2 = t2;
            switch (t2) {
              case "blob":
              case "arraybuffer":
                n2 = "uint8array";
                break;
              case "base64":
                n2 = "string";
            }
            try {
              this._internalType = n2, this._outputType = t2, this._mimeType = r2, h.checkSupport(n2), this._worker = e2.pipe(new i(n2)), e2.lock();
            } catch (e3) {
              this._worker = new s("error"), this._worker.error(e3);
            }
          }
          f.prototype = { accumulate: function(e2) {
            return l(this, e2);
          }, on: function(e2, t2) {
            var r2 = this;
            return "data" === e2 ? this._worker.on(e2, function(e3) {
              t2.call(r2, e3.data, e3.meta);
            }) : this._worker.on(e2, function() {
              h.delay(t2, arguments, r2);
            }), this;
          }, resume: function() {
            return h.delay(this._worker.resume, [], this._worker), this;
          }, pause: function() {
            return this._worker.pause(), this;
          }, toNodejsStream: function(e2) {
            if (h.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
            return new o(this, { objectMode: "nodebuffer" !== this._outputType }, e2);
          } }, t.exports = f;
        }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(e, t, r) {
          "use strict";
          if (r.base64 = true, r.array = true, r.string = true, r.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, r.nodebuffer = "undefined" != typeof Buffer, r.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) r.blob = false;
          else {
            var n = new ArrayBuffer(0);
            try {
              r.blob = 0 === new Blob([n], { type: "application/zip" }).size;
            } catch (e2) {
              try {
                var i = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
                i.append(n), r.blob = 0 === i.getBlob("application/zip").size;
              } catch (e3) {
                r.blob = false;
              }
            }
          }
          try {
            r.nodestream = !!e("readable-stream").Readable;
          } catch (e2) {
            r.nodestream = false;
          }
        }, { "readable-stream": 16 }], 31: [function(e, t, s) {
          "use strict";
          for (var o = e("./utils"), h = e("./support"), r = e("./nodejsUtils"), n = e("./stream/GenericWorker"), u = new Array(256), i = 0; i < 256; i++) u[i] = 252 <= i ? 6 : 248 <= i ? 5 : 240 <= i ? 4 : 224 <= i ? 3 : 192 <= i ? 2 : 1;
          u[254] = u[254] = 1;
          function a() {
            n.call(this, "utf-8 decode"), this.leftOver = null;
          }
          function l() {
            n.call(this, "utf-8 encode");
          }
          s.utf8encode = function(e2) {
            return h.nodebuffer ? r.newBufferFrom(e2, "utf-8") : (function(e3) {
              var t2, r2, n2, i2, s2, a2 = e3.length, o2 = 0;
              for (i2 = 0; i2 < a2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o2 += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
              for (t2 = h.uint8array ? new Uint8Array(o2) : new Array(o2), i2 = s2 = 0; s2 < o2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
              return t2;
            })(e2);
          }, s.utf8decode = function(e2) {
            return h.nodebuffer ? o.transformTo("nodebuffer", e2).toString("utf-8") : (function(e3) {
              var t2, r2, n2, i2, s2 = e3.length, a2 = new Array(2 * s2);
              for (t2 = r2 = 0; t2 < s2; ) if ((n2 = e3[t2++]) < 128) a2[r2++] = n2;
              else if (4 < (i2 = u[n2])) a2[r2++] = 65533, t2 += i2 - 1;
              else {
                for (n2 &= 2 === i2 ? 31 : 3 === i2 ? 15 : 7; 1 < i2 && t2 < s2; ) n2 = n2 << 6 | 63 & e3[t2++], i2--;
                1 < i2 ? a2[r2++] = 65533 : n2 < 65536 ? a2[r2++] = n2 : (n2 -= 65536, a2[r2++] = 55296 | n2 >> 10 & 1023, a2[r2++] = 56320 | 1023 & n2);
              }
              return a2.length !== r2 && (a2.subarray ? a2 = a2.subarray(0, r2) : a2.length = r2), o.applyFromCharCode(a2);
            })(e2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2));
          }, o.inherits(a, n), a.prototype.processChunk = function(e2) {
            var t2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2.data);
            if (this.leftOver && this.leftOver.length) {
              if (h.uint8array) {
                var r2 = t2;
                (t2 = new Uint8Array(r2.length + this.leftOver.length)).set(this.leftOver, 0), t2.set(r2, this.leftOver.length);
              } else t2 = this.leftOver.concat(t2);
              this.leftOver = null;
            }
            var n2 = (function(e3, t3) {
              var r3;
              for ((t3 = t3 || e3.length) > e3.length && (t3 = e3.length), r3 = t3 - 1; 0 <= r3 && 128 == (192 & e3[r3]); ) r3--;
              return r3 < 0 ? t3 : 0 === r3 ? t3 : r3 + u[e3[r3]] > t3 ? r3 : t3;
            })(t2), i2 = t2;
            n2 !== t2.length && (h.uint8array ? (i2 = t2.subarray(0, n2), this.leftOver = t2.subarray(n2, t2.length)) : (i2 = t2.slice(0, n2), this.leftOver = t2.slice(n2, t2.length))), this.push({ data: s.utf8decode(i2), meta: e2.meta });
          }, a.prototype.flush = function() {
            this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
          }, s.Utf8DecodeWorker = a, o.inherits(l, n), l.prototype.processChunk = function(e2) {
            this.push({ data: s.utf8encode(e2.data), meta: e2.meta });
          }, s.Utf8EncodeWorker = l;
        }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, t, a) {
          "use strict";
          var o = e("./support"), h = e("./base64"), r = e("./nodejsUtils"), u = e("./external");
          function n(e2) {
            return e2;
          }
          function l(e2, t2) {
            for (var r2 = 0; r2 < e2.length; ++r2) t2[r2] = 255 & e2.charCodeAt(r2);
            return t2;
          }
          e("setimmediate"), a.newBlob = function(t2, r2) {
            a.checkSupport("blob");
            try {
              return new Blob([t2], { type: r2 });
            } catch (e2) {
              try {
                var n2 = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
                return n2.append(t2), n2.getBlob(r2);
              } catch (e3) {
                throw new Error("Bug : can't construct the Blob.");
              }
            }
          };
          var i = { stringifyByChunk: function(e2, t2, r2) {
            var n2 = [], i2 = 0, s2 = e2.length;
            if (s2 <= r2) return String.fromCharCode.apply(null, e2);
            for (; i2 < s2; ) "array" === t2 || "nodebuffer" === t2 ? n2.push(String.fromCharCode.apply(null, e2.slice(i2, Math.min(i2 + r2, s2)))) : n2.push(String.fromCharCode.apply(null, e2.subarray(i2, Math.min(i2 + r2, s2)))), i2 += r2;
            return n2.join("");
          }, stringifyByChar: function(e2) {
            for (var t2 = "", r2 = 0; r2 < e2.length; r2++) t2 += String.fromCharCode(e2[r2]);
            return t2;
          }, applyCanBeUsed: { uint8array: (function() {
            try {
              return o.uint8array && 1 === String.fromCharCode.apply(null, new Uint8Array(1)).length;
            } catch (e2) {
              return false;
            }
          })(), nodebuffer: (function() {
            try {
              return o.nodebuffer && 1 === String.fromCharCode.apply(null, r.allocBuffer(1)).length;
            } catch (e2) {
              return false;
            }
          })() } };
          function s(e2) {
            var t2 = 65536, r2 = a.getTypeOf(e2), n2 = true;
            if ("uint8array" === r2 ? n2 = i.applyCanBeUsed.uint8array : "nodebuffer" === r2 && (n2 = i.applyCanBeUsed.nodebuffer), n2) for (; 1 < t2; ) try {
              return i.stringifyByChunk(e2, r2, t2);
            } catch (e3) {
              t2 = Math.floor(t2 / 2);
            }
            return i.stringifyByChar(e2);
          }
          function f(e2, t2) {
            for (var r2 = 0; r2 < e2.length; r2++) t2[r2] = e2[r2];
            return t2;
          }
          a.applyFromCharCode = s;
          var c = {};
          c.string = { string: n, array: function(e2) {
            return l(e2, new Array(e2.length));
          }, arraybuffer: function(e2) {
            return c.string.uint8array(e2).buffer;
          }, uint8array: function(e2) {
            return l(e2, new Uint8Array(e2.length));
          }, nodebuffer: function(e2) {
            return l(e2, r.allocBuffer(e2.length));
          } }, c.array = { string: s, array: n, arraybuffer: function(e2) {
            return new Uint8Array(e2).buffer;
          }, uint8array: function(e2) {
            return new Uint8Array(e2);
          }, nodebuffer: function(e2) {
            return r.newBufferFrom(e2);
          } }, c.arraybuffer = { string: function(e2) {
            return s(new Uint8Array(e2));
          }, array: function(e2) {
            return f(new Uint8Array(e2), new Array(e2.byteLength));
          }, arraybuffer: n, uint8array: function(e2) {
            return new Uint8Array(e2);
          }, nodebuffer: function(e2) {
            return r.newBufferFrom(new Uint8Array(e2));
          } }, c.uint8array = { string: s, array: function(e2) {
            return f(e2, new Array(e2.length));
          }, arraybuffer: function(e2) {
            return e2.buffer;
          }, uint8array: n, nodebuffer: function(e2) {
            return r.newBufferFrom(e2);
          } }, c.nodebuffer = { string: s, array: function(e2) {
            return f(e2, new Array(e2.length));
          }, arraybuffer: function(e2) {
            return c.nodebuffer.uint8array(e2).buffer;
          }, uint8array: function(e2) {
            return f(e2, new Uint8Array(e2.length));
          }, nodebuffer: n }, a.transformTo = function(e2, t2) {
            if (t2 = t2 || "", !e2) return t2;
            a.checkSupport(e2);
            var r2 = a.getTypeOf(t2);
            return c[r2][e2](t2);
          }, a.resolve = function(e2) {
            for (var t2 = e2.split("/"), r2 = [], n2 = 0; n2 < t2.length; n2++) {
              var i2 = t2[n2];
              "." === i2 || "" === i2 && 0 !== n2 && n2 !== t2.length - 1 || (".." === i2 ? r2.pop() : r2.push(i2));
            }
            return r2.join("/");
          }, a.getTypeOf = function(e2) {
            if ("string" == typeof e2) return "string";
            var t2 = Object.prototype.toString.call(e2);
            return "[object Array]" === t2 ? "array" : o.nodebuffer && r.isBuffer(e2) ? "nodebuffer" : o.uint8array && "[object Uint8Array]" === t2 ? "uint8array" : o.arraybuffer && "[object ArrayBuffer]" === t2 ? "arraybuffer" : void 0;
          }, a.checkSupport = function(e2) {
            if (!o[e2.toLowerCase()]) throw new Error(e2 + " is not supported by this platform");
          }, a.MAX_VALUE_16BITS = 65535, a.MAX_VALUE_32BITS = -1, a.pretty = function(e2) {
            var t2, r2, n2 = "";
            for (r2 = 0; r2 < (e2 || "").length; r2++) n2 += "\\x" + ((t2 = e2.charCodeAt(r2)) < 16 ? "0" : "") + t2.toString(16).toUpperCase();
            return n2;
          }, a.delay = function(e2, t2, r2) {
            setImmediate(function() {
              e2.apply(r2 || null, t2 || []);
            });
          }, a.inherits = function(e2, t2) {
            function r2() {
            }
            r2.prototype = t2.prototype, e2.prototype = new r2();
          }, a.extend = function() {
            var e2, t2, r2 = {};
            for (e2 = 0; e2 < arguments.length; e2++) for (t2 in arguments[e2]) Object.prototype.hasOwnProperty.call(arguments[e2], t2) && void 0 === r2[t2] && (r2[t2] = arguments[e2][t2]);
            return r2;
          }, a.prepareContent = function(r2, e2, n2, i2, s2) {
            return u.Promise.resolve(e2).then(function(n3) {
              return o.blob && (n3 instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(n3))) ? void 0 !== Blob.prototype.arrayBuffer ? n3.arrayBuffer() : "undefined" != typeof FileReader ? new u.Promise(function(t2, r3) {
                var e3 = new FileReader();
                e3.onload = function(e4) {
                  t2(e4.target.result);
                }, e3.onerror = function(e4) {
                  r3(e4.target.error);
                }, e3.readAsArrayBuffer(n3);
              }) : u.Promise.reject(new Error(r2 + " is a Blob, but we have no way of reading it.")) : n3;
            }).then(function(e3) {
              var t2 = a.getTypeOf(e3);
              return t2 ? ("arraybuffer" === t2 ? e3 = a.transformTo("uint8array", e3) : "string" === t2 && (s2 ? e3 = h.decode(e3) : n2 && true !== i2 && (e3 = (function(e4) {
                return l(e4, o.uint8array ? new Uint8Array(e4.length) : new Array(e4.length));
              })(e3))), e3) : u.Promise.reject(new Error("Can't read the data of '" + r2 + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
            });
          };
        }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, t, r) {
          "use strict";
          var n = e("./reader/readerFor"), i = e("./utils"), s = e("./signature"), a = e("./zipEntry"), o = e("./support");
          function h(e2) {
            this.files = [], this.loadOptions = e2;
          }
          h.prototype = { checkSignature: function(e2) {
            if (!this.reader.readAndCheckSignature(e2)) {
              this.reader.index -= 4;
              var t2 = this.reader.readString(4);
              throw new Error("Corrupted zip or bug: unexpected signature (" + i.pretty(t2) + ", expected " + i.pretty(e2) + ")");
            }
          }, isSignature: function(e2, t2) {
            var r2 = this.reader.index;
            this.reader.setIndex(e2);
            var n2 = this.reader.readString(4) === t2;
            return this.reader.setIndex(r2), n2;
          }, readBlockEndOfCentral: function() {
            this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
            var e2 = this.reader.readData(this.zipCommentLength), t2 = o.uint8array ? "uint8array" : "array", r2 = i.transformTo(t2, e2);
            this.zipComment = this.loadOptions.decodeFileName(r2);
          }, readBlockZip64EndOfCentral: function() {
            this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
            for (var e2, t2, r2, n2 = this.zip64EndOfCentralSize - 44; 0 < n2; ) e2 = this.reader.readInt(2), t2 = this.reader.readInt(4), r2 = this.reader.readData(t2), this.zip64ExtensibleData[e2] = { id: e2, length: t2, value: r2 };
          }, readBlockZip64EndOfCentralLocator: function() {
            if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
          }, readLocalFiles: function() {
            var e2, t2;
            for (e2 = 0; e2 < this.files.length; e2++) t2 = this.files[e2], this.reader.setIndex(t2.localHeaderOffset), this.checkSignature(s.LOCAL_FILE_HEADER), t2.readLocalPart(this.reader), t2.handleUTF8(), t2.processAttributes();
          }, readCentralDir: function() {
            var e2;
            for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER); ) (e2 = new a({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e2);
            if (this.centralDirRecords !== this.files.length && 0 !== this.centralDirRecords && 0 === this.files.length) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
          }, readEndOfCentral: function() {
            var e2 = this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);
            if (e2 < 0) throw !this.isSignature(0, s.LOCAL_FILE_HEADER) ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
            this.reader.setIndex(e2);
            var t2 = e2;
            if (this.checkSignature(s.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === i.MAX_VALUE_16BITS || this.diskWithCentralDirStart === i.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === i.MAX_VALUE_16BITS || this.centralDirRecords === i.MAX_VALUE_16BITS || this.centralDirSize === i.MAX_VALUE_32BITS || this.centralDirOffset === i.MAX_VALUE_32BITS) {
              if (this.zip64 = true, (e2 = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
              if (this.reader.setIndex(e2), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, s.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
              this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
            }
            var r2 = this.centralDirOffset + this.centralDirSize;
            this.zip64 && (r2 += 20, r2 += 12 + this.zip64EndOfCentralSize);
            var n2 = t2 - r2;
            if (0 < n2) this.isSignature(t2, s.CENTRAL_FILE_HEADER) || (this.reader.zero = n2);
            else if (n2 < 0) throw new Error("Corrupted zip: missing " + Math.abs(n2) + " bytes.");
          }, prepareReader: function(e2) {
            this.reader = n(e2);
          }, load: function(e2) {
            this.prepareReader(e2), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
          } }, t.exports = h;
        }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, t, r) {
          "use strict";
          var n = e("./reader/readerFor"), s = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), o = e("./utf8"), h = e("./compressions"), u = e("./support");
          function l(e2, t2) {
            this.options = e2, this.loadOptions = t2;
          }
          l.prototype = { isEncrypted: function() {
            return 1 == (1 & this.bitFlag);
          }, useUTF8: function() {
            return 2048 == (2048 & this.bitFlag);
          }, readLocalPart: function(e2) {
            var t2, r2;
            if (e2.skip(22), this.fileNameLength = e2.readInt(2), r2 = e2.readInt(2), this.fileName = e2.readData(this.fileNameLength), e2.skip(r2), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
            if (null === (t2 = (function(e3) {
              for (var t3 in h) if (Object.prototype.hasOwnProperty.call(h, t3) && h[t3].magic === e3) return h[t3];
              return null;
            })(this.compressionMethod))) throw new Error("Corrupted zip : compression " + s.pretty(this.compressionMethod) + " unknown (inner file : " + s.transformTo("string", this.fileName) + ")");
            this.decompressed = new i(this.compressedSize, this.uncompressedSize, this.crc32, t2, e2.readData(this.compressedSize));
          }, readCentralPart: function(e2) {
            this.versionMadeBy = e2.readInt(2), e2.skip(2), this.bitFlag = e2.readInt(2), this.compressionMethod = e2.readString(2), this.date = e2.readDate(), this.crc32 = e2.readInt(4), this.compressedSize = e2.readInt(4), this.uncompressedSize = e2.readInt(4);
            var t2 = e2.readInt(2);
            if (this.extraFieldsLength = e2.readInt(2), this.fileCommentLength = e2.readInt(2), this.diskNumberStart = e2.readInt(2), this.internalFileAttributes = e2.readInt(2), this.externalFileAttributes = e2.readInt(4), this.localHeaderOffset = e2.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
            e2.skip(t2), this.readExtraFields(e2), this.parseZIP64ExtraField(e2), this.fileComment = e2.readData(this.fileCommentLength);
          }, processAttributes: function() {
            this.unixPermissions = null, this.dosPermissions = null;
            var e2 = this.versionMadeBy >> 8;
            this.dir = !!(16 & this.externalFileAttributes), 0 == e2 && (this.dosPermissions = 63 & this.externalFileAttributes), 3 == e2 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || "/" !== this.fileNameStr.slice(-1) || (this.dir = true);
          }, parseZIP64ExtraField: function() {
            if (this.extraFields[1]) {
              var e2 = n(this.extraFields[1].value);
              this.uncompressedSize === s.MAX_VALUE_32BITS && (this.uncompressedSize = e2.readInt(8)), this.compressedSize === s.MAX_VALUE_32BITS && (this.compressedSize = e2.readInt(8)), this.localHeaderOffset === s.MAX_VALUE_32BITS && (this.localHeaderOffset = e2.readInt(8)), this.diskNumberStart === s.MAX_VALUE_32BITS && (this.diskNumberStart = e2.readInt(4));
            }
          }, readExtraFields: function(e2) {
            var t2, r2, n2, i2 = e2.index + this.extraFieldsLength;
            for (this.extraFields || (this.extraFields = {}); e2.index + 4 < i2; ) t2 = e2.readInt(2), r2 = e2.readInt(2), n2 = e2.readData(r2), this.extraFields[t2] = { id: t2, length: r2, value: n2 };
            e2.setIndex(i2);
          }, handleUTF8: function() {
            var e2 = u.uint8array ? "uint8array" : "array";
            if (this.useUTF8()) this.fileNameStr = o.utf8decode(this.fileName), this.fileCommentStr = o.utf8decode(this.fileComment);
            else {
              var t2 = this.findExtraFieldUnicodePath();
              if (null !== t2) this.fileNameStr = t2;
              else {
                var r2 = s.transformTo(e2, this.fileName);
                this.fileNameStr = this.loadOptions.decodeFileName(r2);
              }
              var n2 = this.findExtraFieldUnicodeComment();
              if (null !== n2) this.fileCommentStr = n2;
              else {
                var i2 = s.transformTo(e2, this.fileComment);
                this.fileCommentStr = this.loadOptions.decodeFileName(i2);
              }
            }
          }, findExtraFieldUnicodePath: function() {
            var e2 = this.extraFields[28789];
            if (e2) {
              var t2 = n(e2.value);
              return 1 !== t2.readInt(1) ? null : a(this.fileName) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
            }
            return null;
          }, findExtraFieldUnicodeComment: function() {
            var e2 = this.extraFields[25461];
            if (e2) {
              var t2 = n(e2.value);
              return 1 !== t2.readInt(1) ? null : a(this.fileComment) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
            }
            return null;
          } }, t.exports = l;
        }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, t, r) {
          "use strict";
          function n(e2, t2, r2) {
            this.name = e2, this.dir = r2.dir, this.date = r2.date, this.comment = r2.comment, this.unixPermissions = r2.unixPermissions, this.dosPermissions = r2.dosPermissions, this._data = t2, this._dataBinary = r2.binary, this.options = { compression: r2.compression, compressionOptions: r2.compressionOptions };
          }
          var s = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), o = e("./compressedObject"), h = e("./stream/GenericWorker");
          n.prototype = { internalStream: function(e2) {
            var t2 = null, r2 = "string";
            try {
              if (!e2) throw new Error("No output type specified.");
              var n2 = "string" === (r2 = e2.toLowerCase()) || "text" === r2;
              "binarystring" !== r2 && "text" !== r2 || (r2 = "string"), t2 = this._decompressWorker();
              var i2 = !this._dataBinary;
              i2 && !n2 && (t2 = t2.pipe(new a.Utf8EncodeWorker())), !i2 && n2 && (t2 = t2.pipe(new a.Utf8DecodeWorker()));
            } catch (e3) {
              (t2 = new h("error")).error(e3);
            }
            return new s(t2, r2, "");
          }, async: function(e2, t2) {
            return this.internalStream(e2).accumulate(t2);
          }, nodeStream: function(e2, t2) {
            return this.internalStream(e2 || "nodebuffer").toNodejsStream(t2);
          }, _compressWorker: function(e2, t2) {
            if (this._data instanceof o && this._data.compression.magic === e2.magic) return this._data.getCompressedWorker();
            var r2 = this._decompressWorker();
            return this._dataBinary || (r2 = r2.pipe(new a.Utf8EncodeWorker())), o.createWorkerFrom(r2, e2, t2);
          }, _decompressWorker: function() {
            return this._data instanceof o ? this._data.getContentWorker() : this._data instanceof h ? this._data : new i(this._data);
          } };
          for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], l = function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
          }, f = 0; f < u.length; f++) n.prototype[u[f]] = l;
          t.exports = n;
        }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, l, t) {
          (function(t2) {
            "use strict";
            var r, n, e2 = t2.MutationObserver || t2.WebKitMutationObserver;
            if (e2) {
              var i = 0, s = new e2(u), a = t2.document.createTextNode("");
              s.observe(a, { characterData: true }), r = function() {
                a.data = i = ++i % 2;
              };
            } else if (t2.setImmediate || void 0 === t2.MessageChannel) r = "document" in t2 && "onreadystatechange" in t2.document.createElement("script") ? function() {
              var e3 = t2.document.createElement("script");
              e3.onreadystatechange = function() {
                u(), e3.onreadystatechange = null, e3.parentNode.removeChild(e3), e3 = null;
              }, t2.document.documentElement.appendChild(e3);
            } : function() {
              setTimeout(u, 0);
            };
            else {
              var o = new t2.MessageChannel();
              o.port1.onmessage = u, r = function() {
                o.port2.postMessage(0);
              };
            }
            var h = [];
            function u() {
              var e3, t3;
              n = true;
              for (var r2 = h.length; r2; ) {
                for (t3 = h, h = [], e3 = -1; ++e3 < r2; ) t3[e3]();
                r2 = h.length;
              }
              n = false;
            }
            l.exports = function(e3) {
              1 !== h.push(e3) || n || r();
            };
          }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
        }, {}], 37: [function(e, t, r) {
          "use strict";
          var i = e("immediate");
          function u() {
          }
          var l = {}, s = ["REJECTED"], a = ["FULFILLED"], n = ["PENDING"];
          function o(e2) {
            if ("function" != typeof e2) throw new TypeError("resolver must be a function");
            this.state = n, this.queue = [], this.outcome = void 0, e2 !== u && d(this, e2);
          }
          function h(e2, t2, r2) {
            this.promise = e2, "function" == typeof t2 && (this.onFulfilled = t2, this.callFulfilled = this.otherCallFulfilled), "function" == typeof r2 && (this.onRejected = r2, this.callRejected = this.otherCallRejected);
          }
          function f(t2, r2, n2) {
            i(function() {
              var e2;
              try {
                e2 = r2(n2);
              } catch (e3) {
                return l.reject(t2, e3);
              }
              e2 === t2 ? l.reject(t2, new TypeError("Cannot resolve promise with itself")) : l.resolve(t2, e2);
            });
          }
          function c(e2) {
            var t2 = e2 && e2.then;
            if (e2 && ("object" == typeof e2 || "function" == typeof e2) && "function" == typeof t2) return function() {
              t2.apply(e2, arguments);
            };
          }
          function d(t2, e2) {
            var r2 = false;
            function n2(e3) {
              r2 || (r2 = true, l.reject(t2, e3));
            }
            function i2(e3) {
              r2 || (r2 = true, l.resolve(t2, e3));
            }
            var s2 = p(function() {
              e2(i2, n2);
            });
            "error" === s2.status && n2(s2.value);
          }
          function p(e2, t2) {
            var r2 = {};
            try {
              r2.value = e2(t2), r2.status = "success";
            } catch (e3) {
              r2.status = "error", r2.value = e3;
            }
            return r2;
          }
          (t.exports = o).prototype.finally = function(t2) {
            if ("function" != typeof t2) return this;
            var r2 = this.constructor;
            return this.then(function(e2) {
              return r2.resolve(t2()).then(function() {
                return e2;
              });
            }, function(e2) {
              return r2.resolve(t2()).then(function() {
                throw e2;
              });
            });
          }, o.prototype.catch = function(e2) {
            return this.then(null, e2);
          }, o.prototype.then = function(e2, t2) {
            if ("function" != typeof e2 && this.state === a || "function" != typeof t2 && this.state === s) return this;
            var r2 = new this.constructor(u);
            this.state !== n ? f(r2, this.state === a ? e2 : t2, this.outcome) : this.queue.push(new h(r2, e2, t2));
            return r2;
          }, h.prototype.callFulfilled = function(e2) {
            l.resolve(this.promise, e2);
          }, h.prototype.otherCallFulfilled = function(e2) {
            f(this.promise, this.onFulfilled, e2);
          }, h.prototype.callRejected = function(e2) {
            l.reject(this.promise, e2);
          }, h.prototype.otherCallRejected = function(e2) {
            f(this.promise, this.onRejected, e2);
          }, l.resolve = function(e2, t2) {
            var r2 = p(c, t2);
            if ("error" === r2.status) return l.reject(e2, r2.value);
            var n2 = r2.value;
            if (n2) d(e2, n2);
            else {
              e2.state = a, e2.outcome = t2;
              for (var i2 = -1, s2 = e2.queue.length; ++i2 < s2; ) e2.queue[i2].callFulfilled(t2);
            }
            return e2;
          }, l.reject = function(e2, t2) {
            e2.state = s, e2.outcome = t2;
            for (var r2 = -1, n2 = e2.queue.length; ++r2 < n2; ) e2.queue[r2].callRejected(t2);
            return e2;
          }, o.resolve = function(e2) {
            if (e2 instanceof this) return e2;
            return l.resolve(new this(u), e2);
          }, o.reject = function(e2) {
            var t2 = new this(u);
            return l.reject(t2, e2);
          }, o.all = function(e2) {
            var r2 = this;
            if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
            var n2 = e2.length, i2 = false;
            if (!n2) return this.resolve([]);
            var s2 = new Array(n2), a2 = 0, t2 = -1, o2 = new this(u);
            for (; ++t2 < n2; ) h2(e2[t2], t2);
            return o2;
            function h2(e3, t3) {
              r2.resolve(e3).then(function(e4) {
                s2[t3] = e4, ++a2 !== n2 || i2 || (i2 = true, l.resolve(o2, s2));
              }, function(e4) {
                i2 || (i2 = true, l.reject(o2, e4));
              });
            }
          }, o.race = function(e2) {
            var t2 = this;
            if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
            var r2 = e2.length, n2 = false;
            if (!r2) return this.resolve([]);
            var i2 = -1, s2 = new this(u);
            for (; ++i2 < r2; ) a2 = e2[i2], t2.resolve(a2).then(function(e3) {
              n2 || (n2 = true, l.resolve(s2, e3));
            }, function(e3) {
              n2 || (n2 = true, l.reject(s2, e3));
            });
            var a2;
            return s2;
          };
        }, { immediate: 36 }], 38: [function(e, t, r) {
          "use strict";
          var n = {};
          (0, e("./lib/utils/common").assign)(n, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = n;
        }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, t, r) {
          "use strict";
          var a = e("./zlib/deflate"), o = e("./utils/common"), h = e("./utils/strings"), i = e("./zlib/messages"), s = e("./zlib/zstream"), u = Object.prototype.toString, l = 0, f = -1, c = 0, d = 8;
          function p(e2) {
            if (!(this instanceof p)) return new p(e2);
            this.options = o.assign({ level: f, method: d, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: c, to: "" }, e2 || {});
            var t2 = this.options;
            t2.raw && 0 < t2.windowBits ? t2.windowBits = -t2.windowBits : t2.gzip && 0 < t2.windowBits && t2.windowBits < 16 && (t2.windowBits += 16), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
            var r2 = a.deflateInit2(this.strm, t2.level, t2.method, t2.windowBits, t2.memLevel, t2.strategy);
            if (r2 !== l) throw new Error(i[r2]);
            if (t2.header && a.deflateSetHeader(this.strm, t2.header), t2.dictionary) {
              var n2;
              if (n2 = "string" == typeof t2.dictionary ? h.string2buf(t2.dictionary) : "[object ArrayBuffer]" === u.call(t2.dictionary) ? new Uint8Array(t2.dictionary) : t2.dictionary, (r2 = a.deflateSetDictionary(this.strm, n2)) !== l) throw new Error(i[r2]);
              this._dict_set = true;
            }
          }
          function n(e2, t2) {
            var r2 = new p(t2);
            if (r2.push(e2, true), r2.err) throw r2.msg || i[r2.err];
            return r2.result;
          }
          p.prototype.push = function(e2, t2) {
            var r2, n2, i2 = this.strm, s2 = this.options.chunkSize;
            if (this.ended) return false;
            n2 = t2 === ~~t2 ? t2 : true === t2 ? 4 : 0, "string" == typeof e2 ? i2.input = h.string2buf(e2) : "[object ArrayBuffer]" === u.call(e2) ? i2.input = new Uint8Array(e2) : i2.input = e2, i2.next_in = 0, i2.avail_in = i2.input.length;
            do {
              if (0 === i2.avail_out && (i2.output = new o.Buf8(s2), i2.next_out = 0, i2.avail_out = s2), 1 !== (r2 = a.deflate(i2, n2)) && r2 !== l) return this.onEnd(r2), !(this.ended = true);
              0 !== i2.avail_out && (0 !== i2.avail_in || 4 !== n2 && 2 !== n2) || ("string" === this.options.to ? this.onData(h.buf2binstring(o.shrinkBuf(i2.output, i2.next_out))) : this.onData(o.shrinkBuf(i2.output, i2.next_out)));
            } while ((0 < i2.avail_in || 0 === i2.avail_out) && 1 !== r2);
            return 4 === n2 ? (r2 = a.deflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === l) : 2 !== n2 || (this.onEnd(l), !(i2.avail_out = 0));
          }, p.prototype.onData = function(e2) {
            this.chunks.push(e2);
          }, p.prototype.onEnd = function(e2) {
            e2 === l && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
          }, r.Deflate = p, r.deflate = n, r.deflateRaw = function(e2, t2) {
            return (t2 = t2 || {}).raw = true, n(e2, t2);
          }, r.gzip = function(e2, t2) {
            return (t2 = t2 || {}).gzip = true, n(e2, t2);
          };
        }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, t, r) {
          "use strict";
          var c = e("./zlib/inflate"), d = e("./utils/common"), p = e("./utils/strings"), m = e("./zlib/constants"), n = e("./zlib/messages"), i = e("./zlib/zstream"), s = e("./zlib/gzheader"), _ = Object.prototype.toString;
          function a(e2) {
            if (!(this instanceof a)) return new a(e2);
            this.options = d.assign({ chunkSize: 16384, windowBits: 0, to: "" }, e2 || {});
            var t2 = this.options;
            t2.raw && 0 <= t2.windowBits && t2.windowBits < 16 && (t2.windowBits = -t2.windowBits, 0 === t2.windowBits && (t2.windowBits = -15)), !(0 <= t2.windowBits && t2.windowBits < 16) || e2 && e2.windowBits || (t2.windowBits += 32), 15 < t2.windowBits && t2.windowBits < 48 && 0 == (15 & t2.windowBits) && (t2.windowBits |= 15), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
            var r2 = c.inflateInit2(this.strm, t2.windowBits);
            if (r2 !== m.Z_OK) throw new Error(n[r2]);
            this.header = new s(), c.inflateGetHeader(this.strm, this.header);
          }
          function o(e2, t2) {
            var r2 = new a(t2);
            if (r2.push(e2, true), r2.err) throw r2.msg || n[r2.err];
            return r2.result;
          }
          a.prototype.push = function(e2, t2) {
            var r2, n2, i2, s2, a2, o2, h = this.strm, u = this.options.chunkSize, l = this.options.dictionary, f = false;
            if (this.ended) return false;
            n2 = t2 === ~~t2 ? t2 : true === t2 ? m.Z_FINISH : m.Z_NO_FLUSH, "string" == typeof e2 ? h.input = p.binstring2buf(e2) : "[object ArrayBuffer]" === _.call(e2) ? h.input = new Uint8Array(e2) : h.input = e2, h.next_in = 0, h.avail_in = h.input.length;
            do {
              if (0 === h.avail_out && (h.output = new d.Buf8(u), h.next_out = 0, h.avail_out = u), (r2 = c.inflate(h, m.Z_NO_FLUSH)) === m.Z_NEED_DICT && l && (o2 = "string" == typeof l ? p.string2buf(l) : "[object ArrayBuffer]" === _.call(l) ? new Uint8Array(l) : l, r2 = c.inflateSetDictionary(this.strm, o2)), r2 === m.Z_BUF_ERROR && true === f && (r2 = m.Z_OK, f = false), r2 !== m.Z_STREAM_END && r2 !== m.Z_OK) return this.onEnd(r2), !(this.ended = true);
              h.next_out && (0 !== h.avail_out && r2 !== m.Z_STREAM_END && (0 !== h.avail_in || n2 !== m.Z_FINISH && n2 !== m.Z_SYNC_FLUSH) || ("string" === this.options.to ? (i2 = p.utf8border(h.output, h.next_out), s2 = h.next_out - i2, a2 = p.buf2string(h.output, i2), h.next_out = s2, h.avail_out = u - s2, s2 && d.arraySet(h.output, h.output, i2, s2, 0), this.onData(a2)) : this.onData(d.shrinkBuf(h.output, h.next_out)))), 0 === h.avail_in && 0 === h.avail_out && (f = true);
            } while ((0 < h.avail_in || 0 === h.avail_out) && r2 !== m.Z_STREAM_END);
            return r2 === m.Z_STREAM_END && (n2 = m.Z_FINISH), n2 === m.Z_FINISH ? (r2 = c.inflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === m.Z_OK) : n2 !== m.Z_SYNC_FLUSH || (this.onEnd(m.Z_OK), !(h.avail_out = 0));
          }, a.prototype.onData = function(e2) {
            this.chunks.push(e2);
          }, a.prototype.onEnd = function(e2) {
            e2 === m.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = d.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
          }, r.Inflate = a, r.inflate = o, r.inflateRaw = function(e2, t2) {
            return (t2 = t2 || {}).raw = true, o(e2, t2);
          }, r.ungzip = o;
        }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, t, r) {
          "use strict";
          var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
          r.assign = function(e2) {
            for (var t2 = Array.prototype.slice.call(arguments, 1); t2.length; ) {
              var r2 = t2.shift();
              if (r2) {
                if ("object" != typeof r2) throw new TypeError(r2 + "must be non-object");
                for (var n2 in r2) r2.hasOwnProperty(n2) && (e2[n2] = r2[n2]);
              }
            }
            return e2;
          }, r.shrinkBuf = function(e2, t2) {
            return e2.length === t2 ? e2 : e2.subarray ? e2.subarray(0, t2) : (e2.length = t2, e2);
          };
          var i = { arraySet: function(e2, t2, r2, n2, i2) {
            if (t2.subarray && e2.subarray) e2.set(t2.subarray(r2, r2 + n2), i2);
            else for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
          }, flattenChunks: function(e2) {
            var t2, r2, n2, i2, s2, a;
            for (t2 = n2 = 0, r2 = e2.length; t2 < r2; t2++) n2 += e2[t2].length;
            for (a = new Uint8Array(n2), t2 = i2 = 0, r2 = e2.length; t2 < r2; t2++) s2 = e2[t2], a.set(s2, i2), i2 += s2.length;
            return a;
          } }, s = { arraySet: function(e2, t2, r2, n2, i2) {
            for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
          }, flattenChunks: function(e2) {
            return [].concat.apply([], e2);
          } };
          r.setTyped = function(e2) {
            e2 ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, i)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, s));
          }, r.setTyped(n);
        }, {}], 42: [function(e, t, r) {
          "use strict";
          var h = e("./common"), i = true, s = true;
          try {
            String.fromCharCode.apply(null, [0]);
          } catch (e2) {
            i = false;
          }
          try {
            String.fromCharCode.apply(null, new Uint8Array(1));
          } catch (e2) {
            s = false;
          }
          for (var u = new h.Buf8(256), n = 0; n < 256; n++) u[n] = 252 <= n ? 6 : 248 <= n ? 5 : 240 <= n ? 4 : 224 <= n ? 3 : 192 <= n ? 2 : 1;
          function l(e2, t2) {
            if (t2 < 65537 && (e2.subarray && s || !e2.subarray && i)) return String.fromCharCode.apply(null, h.shrinkBuf(e2, t2));
            for (var r2 = "", n2 = 0; n2 < t2; n2++) r2 += String.fromCharCode(e2[n2]);
            return r2;
          }
          u[254] = u[254] = 1, r.string2buf = function(e2) {
            var t2, r2, n2, i2, s2, a = e2.length, o = 0;
            for (i2 = 0; i2 < a; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
            for (t2 = new h.Buf8(o), i2 = s2 = 0; s2 < o; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
            return t2;
          }, r.buf2binstring = function(e2) {
            return l(e2, e2.length);
          }, r.binstring2buf = function(e2) {
            for (var t2 = new h.Buf8(e2.length), r2 = 0, n2 = t2.length; r2 < n2; r2++) t2[r2] = e2.charCodeAt(r2);
            return t2;
          }, r.buf2string = function(e2, t2) {
            var r2, n2, i2, s2, a = t2 || e2.length, o = new Array(2 * a);
            for (r2 = n2 = 0; r2 < a; ) if ((i2 = e2[r2++]) < 128) o[n2++] = i2;
            else if (4 < (s2 = u[i2])) o[n2++] = 65533, r2 += s2 - 1;
            else {
              for (i2 &= 2 === s2 ? 31 : 3 === s2 ? 15 : 7; 1 < s2 && r2 < a; ) i2 = i2 << 6 | 63 & e2[r2++], s2--;
              1 < s2 ? o[n2++] = 65533 : i2 < 65536 ? o[n2++] = i2 : (i2 -= 65536, o[n2++] = 55296 | i2 >> 10 & 1023, o[n2++] = 56320 | 1023 & i2);
            }
            return l(o, n2);
          }, r.utf8border = function(e2, t2) {
            var r2;
            for ((t2 = t2 || e2.length) > e2.length && (t2 = e2.length), r2 = t2 - 1; 0 <= r2 && 128 == (192 & e2[r2]); ) r2--;
            return r2 < 0 ? t2 : 0 === r2 ? t2 : r2 + u[e2[r2]] > t2 ? r2 : t2;
          };
        }, { "./common": 41 }], 43: [function(e, t, r) {
          "use strict";
          t.exports = function(e2, t2, r2, n) {
            for (var i = 65535 & e2 | 0, s = e2 >>> 16 & 65535 | 0, a = 0; 0 !== r2; ) {
              for (r2 -= a = 2e3 < r2 ? 2e3 : r2; s = s + (i = i + t2[n++] | 0) | 0, --a; ) ;
              i %= 65521, s %= 65521;
            }
            return i | s << 16 | 0;
          };
        }, {}], 44: [function(e, t, r) {
          "use strict";
          t.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
        }, {}], 45: [function(e, t, r) {
          "use strict";
          var o = (function() {
            for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
              e2 = r2;
              for (var n = 0; n < 8; n++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
              t2[r2] = e2;
            }
            return t2;
          })();
          t.exports = function(e2, t2, r2, n) {
            var i = o, s = n + r2;
            e2 ^= -1;
            for (var a = n; a < s; a++) e2 = e2 >>> 8 ^ i[255 & (e2 ^ t2[a])];
            return -1 ^ e2;
          };
        }, {}], 46: [function(e, t, r) {
          "use strict";
          var h, c = e("../utils/common"), u = e("./trees"), d = e("./adler32"), p = e("./crc32"), n = e("./messages"), l = 0, f = 4, m = 0, _ = -2, g = -1, b = 4, i = 2, v = 8, y = 9, s = 286, a = 30, o = 19, w = 2 * s + 1, k = 15, x = 3, S = 258, z = S + x + 1, C = 42, E = 113, A = 1, I = 2, O = 3, B = 4;
          function R(e2, t2) {
            return e2.msg = n[t2], t2;
          }
          function T(e2) {
            return (e2 << 1) - (4 < e2 ? 9 : 0);
          }
          function D(e2) {
            for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
          }
          function F(e2) {
            var t2 = e2.state, r2 = t2.pending;
            r2 > e2.avail_out && (r2 = e2.avail_out), 0 !== r2 && (c.arraySet(e2.output, t2.pending_buf, t2.pending_out, r2, e2.next_out), e2.next_out += r2, t2.pending_out += r2, e2.total_out += r2, e2.avail_out -= r2, t2.pending -= r2, 0 === t2.pending && (t2.pending_out = 0));
          }
          function N(e2, t2) {
            u._tr_flush_block(e2, 0 <= e2.block_start ? e2.block_start : -1, e2.strstart - e2.block_start, t2), e2.block_start = e2.strstart, F(e2.strm);
          }
          function U(e2, t2) {
            e2.pending_buf[e2.pending++] = t2;
          }
          function P(e2, t2) {
            e2.pending_buf[e2.pending++] = t2 >>> 8 & 255, e2.pending_buf[e2.pending++] = 255 & t2;
          }
          function L(e2, t2) {
            var r2, n2, i2 = e2.max_chain_length, s2 = e2.strstart, a2 = e2.prev_length, o2 = e2.nice_match, h2 = e2.strstart > e2.w_size - z ? e2.strstart - (e2.w_size - z) : 0, u2 = e2.window, l2 = e2.w_mask, f2 = e2.prev, c2 = e2.strstart + S, d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
            e2.prev_length >= e2.good_match && (i2 >>= 2), o2 > e2.lookahead && (o2 = e2.lookahead);
            do {
              if (u2[(r2 = t2) + a2] === p2 && u2[r2 + a2 - 1] === d2 && u2[r2] === u2[s2] && u2[++r2] === u2[s2 + 1]) {
                s2 += 2, r2++;
                do {
                } while (u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && s2 < c2);
                if (n2 = S - (c2 - s2), s2 = c2 - S, a2 < n2) {
                  if (e2.match_start = t2, o2 <= (a2 = n2)) break;
                  d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
                }
              }
            } while ((t2 = f2[t2 & l2]) > h2 && 0 != --i2);
            return a2 <= e2.lookahead ? a2 : e2.lookahead;
          }
          function j(e2) {
            var t2, r2, n2, i2, s2, a2, o2, h2, u2, l2, f2 = e2.w_size;
            do {
              if (i2 = e2.window_size - e2.lookahead - e2.strstart, e2.strstart >= f2 + (f2 - z)) {
                for (c.arraySet(e2.window, e2.window, f2, f2, 0), e2.match_start -= f2, e2.strstart -= f2, e2.block_start -= f2, t2 = r2 = e2.hash_size; n2 = e2.head[--t2], e2.head[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
                for (t2 = r2 = f2; n2 = e2.prev[--t2], e2.prev[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
                i2 += f2;
              }
              if (0 === e2.strm.avail_in) break;
              if (a2 = e2.strm, o2 = e2.window, h2 = e2.strstart + e2.lookahead, u2 = i2, l2 = void 0, l2 = a2.avail_in, u2 < l2 && (l2 = u2), r2 = 0 === l2 ? 0 : (a2.avail_in -= l2, c.arraySet(o2, a2.input, a2.next_in, l2, h2), 1 === a2.state.wrap ? a2.adler = d(a2.adler, o2, l2, h2) : 2 === a2.state.wrap && (a2.adler = p(a2.adler, o2, l2, h2)), a2.next_in += l2, a2.total_in += l2, l2), e2.lookahead += r2, e2.lookahead + e2.insert >= x) for (s2 = e2.strstart - e2.insert, e2.ins_h = e2.window[s2], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + 1]) & e2.hash_mask; e2.insert && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + x - 1]) & e2.hash_mask, e2.prev[s2 & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = s2, s2++, e2.insert--, !(e2.lookahead + e2.insert < x)); ) ;
            } while (e2.lookahead < z && 0 !== e2.strm.avail_in);
          }
          function Z(e2, t2) {
            for (var r2, n2; ; ) {
              if (e2.lookahead < z) {
                if (j(e2), e2.lookahead < z && t2 === l) return A;
                if (0 === e2.lookahead) break;
              }
              if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 !== r2 && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2)), e2.match_length >= x) if (n2 = u._tr_tally(e2, e2.strstart - e2.match_start, e2.match_length - x), e2.lookahead -= e2.match_length, e2.match_length <= e2.max_lazy_match && e2.lookahead >= x) {
                for (e2.match_length--; e2.strstart++, e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart, 0 != --e2.match_length; ) ;
                e2.strstart++;
              } else e2.strstart += e2.match_length, e2.match_length = 0, e2.ins_h = e2.window[e2.strstart], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + 1]) & e2.hash_mask;
              else n2 = u._tr_tally(e2, 0, e2.window[e2.strstart]), e2.lookahead--, e2.strstart++;
              if (n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
            }
            return e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
          }
          function W(e2, t2) {
            for (var r2, n2, i2; ; ) {
              if (e2.lookahead < z) {
                if (j(e2), e2.lookahead < z && t2 === l) return A;
                if (0 === e2.lookahead) break;
              }
              if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), e2.prev_length = e2.match_length, e2.prev_match = e2.match_start, e2.match_length = x - 1, 0 !== r2 && e2.prev_length < e2.max_lazy_match && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2), e2.match_length <= 5 && (1 === e2.strategy || e2.match_length === x && 4096 < e2.strstart - e2.match_start) && (e2.match_length = x - 1)), e2.prev_length >= x && e2.match_length <= e2.prev_length) {
                for (i2 = e2.strstart + e2.lookahead - x, n2 = u._tr_tally(e2, e2.strstart - 1 - e2.prev_match, e2.prev_length - x), e2.lookahead -= e2.prev_length - 1, e2.prev_length -= 2; ++e2.strstart <= i2 && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 != --e2.prev_length; ) ;
                if (e2.match_available = 0, e2.match_length = x - 1, e2.strstart++, n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
              } else if (e2.match_available) {
                if ((n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1])) && N(e2, false), e2.strstart++, e2.lookahead--, 0 === e2.strm.avail_out) return A;
              } else e2.match_available = 1, e2.strstart++, e2.lookahead--;
            }
            return e2.match_available && (n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1]), e2.match_available = 0), e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
          }
          function M(e2, t2, r2, n2, i2) {
            this.good_length = e2, this.max_lazy = t2, this.nice_length = r2, this.max_chain = n2, this.func = i2;
          }
          function H() {
            this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new c.Buf16(2 * w), this.dyn_dtree = new c.Buf16(2 * (2 * a + 1)), this.bl_tree = new c.Buf16(2 * (2 * o + 1)), D(this.dyn_ltree), D(this.dyn_dtree), D(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new c.Buf16(k + 1), this.heap = new c.Buf16(2 * s + 1), D(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new c.Buf16(2 * s + 1), D(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
          }
          function G(e2) {
            var t2;
            return e2 && e2.state ? (e2.total_in = e2.total_out = 0, e2.data_type = i, (t2 = e2.state).pending = 0, t2.pending_out = 0, t2.wrap < 0 && (t2.wrap = -t2.wrap), t2.status = t2.wrap ? C : E, e2.adler = 2 === t2.wrap ? 0 : 1, t2.last_flush = l, u._tr_init(t2), m) : R(e2, _);
          }
          function K(e2) {
            var t2 = G(e2);
            return t2 === m && (function(e3) {
              e3.window_size = 2 * e3.w_size, D(e3.head), e3.max_lazy_match = h[e3.level].max_lazy, e3.good_match = h[e3.level].good_length, e3.nice_match = h[e3.level].nice_length, e3.max_chain_length = h[e3.level].max_chain, e3.strstart = 0, e3.block_start = 0, e3.lookahead = 0, e3.insert = 0, e3.match_length = e3.prev_length = x - 1, e3.match_available = 0, e3.ins_h = 0;
            })(e2.state), t2;
          }
          function Y(e2, t2, r2, n2, i2, s2) {
            if (!e2) return _;
            var a2 = 1;
            if (t2 === g && (t2 = 6), n2 < 0 ? (a2 = 0, n2 = -n2) : 15 < n2 && (a2 = 2, n2 -= 16), i2 < 1 || y < i2 || r2 !== v || n2 < 8 || 15 < n2 || t2 < 0 || 9 < t2 || s2 < 0 || b < s2) return R(e2, _);
            8 === n2 && (n2 = 9);
            var o2 = new H();
            return (e2.state = o2).strm = e2, o2.wrap = a2, o2.gzhead = null, o2.w_bits = n2, o2.w_size = 1 << o2.w_bits, o2.w_mask = o2.w_size - 1, o2.hash_bits = i2 + 7, o2.hash_size = 1 << o2.hash_bits, o2.hash_mask = o2.hash_size - 1, o2.hash_shift = ~~((o2.hash_bits + x - 1) / x), o2.window = new c.Buf8(2 * o2.w_size), o2.head = new c.Buf16(o2.hash_size), o2.prev = new c.Buf16(o2.w_size), o2.lit_bufsize = 1 << i2 + 6, o2.pending_buf_size = 4 * o2.lit_bufsize, o2.pending_buf = new c.Buf8(o2.pending_buf_size), o2.d_buf = 1 * o2.lit_bufsize, o2.l_buf = 3 * o2.lit_bufsize, o2.level = t2, o2.strategy = s2, o2.method = r2, K(e2);
          }
          h = [new M(0, 0, 0, 0, function(e2, t2) {
            var r2 = 65535;
            for (r2 > e2.pending_buf_size - 5 && (r2 = e2.pending_buf_size - 5); ; ) {
              if (e2.lookahead <= 1) {
                if (j(e2), 0 === e2.lookahead && t2 === l) return A;
                if (0 === e2.lookahead) break;
              }
              e2.strstart += e2.lookahead, e2.lookahead = 0;
              var n2 = e2.block_start + r2;
              if ((0 === e2.strstart || e2.strstart >= n2) && (e2.lookahead = e2.strstart - n2, e2.strstart = n2, N(e2, false), 0 === e2.strm.avail_out)) return A;
              if (e2.strstart - e2.block_start >= e2.w_size - z && (N(e2, false), 0 === e2.strm.avail_out)) return A;
            }
            return e2.insert = 0, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : (e2.strstart > e2.block_start && (N(e2, false), e2.strm.avail_out), A);
          }), new M(4, 4, 8, 4, Z), new M(4, 5, 16, 8, Z), new M(4, 6, 32, 32, Z), new M(4, 4, 16, 16, W), new M(8, 16, 32, 32, W), new M(8, 16, 128, 128, W), new M(8, 32, 128, 256, W), new M(32, 128, 258, 1024, W), new M(32, 258, 258, 4096, W)], r.deflateInit = function(e2, t2) {
            return Y(e2, t2, v, 15, 8, 0);
          }, r.deflateInit2 = Y, r.deflateReset = K, r.deflateResetKeep = G, r.deflateSetHeader = function(e2, t2) {
            return e2 && e2.state ? 2 !== e2.state.wrap ? _ : (e2.state.gzhead = t2, m) : _;
          }, r.deflate = function(e2, t2) {
            var r2, n2, i2, s2;
            if (!e2 || !e2.state || 5 < t2 || t2 < 0) return e2 ? R(e2, _) : _;
            if (n2 = e2.state, !e2.output || !e2.input && 0 !== e2.avail_in || 666 === n2.status && t2 !== f) return R(e2, 0 === e2.avail_out ? -5 : _);
            if (n2.strm = e2, r2 = n2.last_flush, n2.last_flush = t2, n2.status === C) if (2 === n2.wrap) e2.adler = 0, U(n2, 31), U(n2, 139), U(n2, 8), n2.gzhead ? (U(n2, (n2.gzhead.text ? 1 : 0) + (n2.gzhead.hcrc ? 2 : 0) + (n2.gzhead.extra ? 4 : 0) + (n2.gzhead.name ? 8 : 0) + (n2.gzhead.comment ? 16 : 0)), U(n2, 255 & n2.gzhead.time), U(n2, n2.gzhead.time >> 8 & 255), U(n2, n2.gzhead.time >> 16 & 255), U(n2, n2.gzhead.time >> 24 & 255), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 255 & n2.gzhead.os), n2.gzhead.extra && n2.gzhead.extra.length && (U(n2, 255 & n2.gzhead.extra.length), U(n2, n2.gzhead.extra.length >> 8 & 255)), n2.gzhead.hcrc && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending, 0)), n2.gzindex = 0, n2.status = 69) : (U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 3), n2.status = E);
            else {
              var a2 = v + (n2.w_bits - 8 << 4) << 8;
              a2 |= (2 <= n2.strategy || n2.level < 2 ? 0 : n2.level < 6 ? 1 : 6 === n2.level ? 2 : 3) << 6, 0 !== n2.strstart && (a2 |= 32), a2 += 31 - a2 % 31, n2.status = E, P(n2, a2), 0 !== n2.strstart && (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), e2.adler = 1;
            }
            if (69 === n2.status) if (n2.gzhead.extra) {
              for (i2 = n2.pending; n2.gzindex < (65535 & n2.gzhead.extra.length) && (n2.pending !== n2.pending_buf_size || (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending !== n2.pending_buf_size)); ) U(n2, 255 & n2.gzhead.extra[n2.gzindex]), n2.gzindex++;
              n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), n2.gzindex === n2.gzhead.extra.length && (n2.gzindex = 0, n2.status = 73);
            } else n2.status = 73;
            if (73 === n2.status) if (n2.gzhead.name) {
              i2 = n2.pending;
              do {
                if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                  s2 = 1;
                  break;
                }
                s2 = n2.gzindex < n2.gzhead.name.length ? 255 & n2.gzhead.name.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
              } while (0 !== s2);
              n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.gzindex = 0, n2.status = 91);
            } else n2.status = 91;
            if (91 === n2.status) if (n2.gzhead.comment) {
              i2 = n2.pending;
              do {
                if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                  s2 = 1;
                  break;
                }
                s2 = n2.gzindex < n2.gzhead.comment.length ? 255 & n2.gzhead.comment.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
              } while (0 !== s2);
              n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.status = 103);
            } else n2.status = 103;
            if (103 === n2.status && (n2.gzhead.hcrc ? (n2.pending + 2 > n2.pending_buf_size && F(e2), n2.pending + 2 <= n2.pending_buf_size && (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), e2.adler = 0, n2.status = E)) : n2.status = E), 0 !== n2.pending) {
              if (F(e2), 0 === e2.avail_out) return n2.last_flush = -1, m;
            } else if (0 === e2.avail_in && T(t2) <= T(r2) && t2 !== f) return R(e2, -5);
            if (666 === n2.status && 0 !== e2.avail_in) return R(e2, -5);
            if (0 !== e2.avail_in || 0 !== n2.lookahead || t2 !== l && 666 !== n2.status) {
              var o2 = 2 === n2.strategy ? (function(e3, t3) {
                for (var r3; ; ) {
                  if (0 === e3.lookahead && (j(e3), 0 === e3.lookahead)) {
                    if (t3 === l) return A;
                    break;
                  }
                  if (e3.match_length = 0, r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++, r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
                }
                return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
              })(n2, t2) : 3 === n2.strategy ? (function(e3, t3) {
                for (var r3, n3, i3, s3, a3 = e3.window; ; ) {
                  if (e3.lookahead <= S) {
                    if (j(e3), e3.lookahead <= S && t3 === l) return A;
                    if (0 === e3.lookahead) break;
                  }
                  if (e3.match_length = 0, e3.lookahead >= x && 0 < e3.strstart && (n3 = a3[i3 = e3.strstart - 1]) === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3]) {
                    s3 = e3.strstart + S;
                    do {
                    } while (n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && i3 < s3);
                    e3.match_length = S - (s3 - i3), e3.match_length > e3.lookahead && (e3.match_length = e3.lookahead);
                  }
                  if (e3.match_length >= x ? (r3 = u._tr_tally(e3, 1, e3.match_length - x), e3.lookahead -= e3.match_length, e3.strstart += e3.match_length, e3.match_length = 0) : (r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++), r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
                }
                return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
              })(n2, t2) : h[n2.level].func(n2, t2);
              if (o2 !== O && o2 !== B || (n2.status = 666), o2 === A || o2 === O) return 0 === e2.avail_out && (n2.last_flush = -1), m;
              if (o2 === I && (1 === t2 ? u._tr_align(n2) : 5 !== t2 && (u._tr_stored_block(n2, 0, 0, false), 3 === t2 && (D(n2.head), 0 === n2.lookahead && (n2.strstart = 0, n2.block_start = 0, n2.insert = 0))), F(e2), 0 === e2.avail_out)) return n2.last_flush = -1, m;
            }
            return t2 !== f ? m : n2.wrap <= 0 ? 1 : (2 === n2.wrap ? (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), U(n2, e2.adler >> 16 & 255), U(n2, e2.adler >> 24 & 255), U(n2, 255 & e2.total_in), U(n2, e2.total_in >> 8 & 255), U(n2, e2.total_in >> 16 & 255), U(n2, e2.total_in >> 24 & 255)) : (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), F(e2), 0 < n2.wrap && (n2.wrap = -n2.wrap), 0 !== n2.pending ? m : 1);
          }, r.deflateEnd = function(e2) {
            var t2;
            return e2 && e2.state ? (t2 = e2.state.status) !== C && 69 !== t2 && 73 !== t2 && 91 !== t2 && 103 !== t2 && t2 !== E && 666 !== t2 ? R(e2, _) : (e2.state = null, t2 === E ? R(e2, -3) : m) : _;
          }, r.deflateSetDictionary = function(e2, t2) {
            var r2, n2, i2, s2, a2, o2, h2, u2, l2 = t2.length;
            if (!e2 || !e2.state) return _;
            if (2 === (s2 = (r2 = e2.state).wrap) || 1 === s2 && r2.status !== C || r2.lookahead) return _;
            for (1 === s2 && (e2.adler = d(e2.adler, t2, l2, 0)), r2.wrap = 0, l2 >= r2.w_size && (0 === s2 && (D(r2.head), r2.strstart = 0, r2.block_start = 0, r2.insert = 0), u2 = new c.Buf8(r2.w_size), c.arraySet(u2, t2, l2 - r2.w_size, r2.w_size, 0), t2 = u2, l2 = r2.w_size), a2 = e2.avail_in, o2 = e2.next_in, h2 = e2.input, e2.avail_in = l2, e2.next_in = 0, e2.input = t2, j(r2); r2.lookahead >= x; ) {
              for (n2 = r2.strstart, i2 = r2.lookahead - (x - 1); r2.ins_h = (r2.ins_h << r2.hash_shift ^ r2.window[n2 + x - 1]) & r2.hash_mask, r2.prev[n2 & r2.w_mask] = r2.head[r2.ins_h], r2.head[r2.ins_h] = n2, n2++, --i2; ) ;
              r2.strstart = n2, r2.lookahead = x - 1, j(r2);
            }
            return r2.strstart += r2.lookahead, r2.block_start = r2.strstart, r2.insert = r2.lookahead, r2.lookahead = 0, r2.match_length = r2.prev_length = x - 1, r2.match_available = 0, e2.next_in = o2, e2.input = h2, e2.avail_in = a2, r2.wrap = s2, m;
          }, r.deflateInfo = "pako deflate (from Nodeca project)";
        }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, t, r) {
          "use strict";
          t.exports = function() {
            this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = false;
          };
        }, {}], 48: [function(e, t, r) {
          "use strict";
          t.exports = function(e2, t2) {
            var r2, n, i, s, a, o, h, u, l, f, c, d, p, m, _, g, b, v, y, w, k, x, S, z, C;
            r2 = e2.state, n = e2.next_in, z = e2.input, i = n + (e2.avail_in - 5), s = e2.next_out, C = e2.output, a = s - (t2 - e2.avail_out), o = s + (e2.avail_out - 257), h = r2.dmax, u = r2.wsize, l = r2.whave, f = r2.wnext, c = r2.window, d = r2.hold, p = r2.bits, m = r2.lencode, _ = r2.distcode, g = (1 << r2.lenbits) - 1, b = (1 << r2.distbits) - 1;
            e: do {
              p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = m[d & g];
              t: for (; ; ) {
                if (d >>>= y = v >>> 24, p -= y, 0 === (y = v >>> 16 & 255)) C[s++] = 65535 & v;
                else {
                  if (!(16 & y)) {
                    if (0 == (64 & y)) {
                      v = m[(65535 & v) + (d & (1 << y) - 1)];
                      continue t;
                    }
                    if (32 & y) {
                      r2.mode = 12;
                      break e;
                    }
                    e2.msg = "invalid literal/length code", r2.mode = 30;
                    break e;
                  }
                  w = 65535 & v, (y &= 15) && (p < y && (d += z[n++] << p, p += 8), w += d & (1 << y) - 1, d >>>= y, p -= y), p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = _[d & b];
                  r: for (; ; ) {
                    if (d >>>= y = v >>> 24, p -= y, !(16 & (y = v >>> 16 & 255))) {
                      if (0 == (64 & y)) {
                        v = _[(65535 & v) + (d & (1 << y) - 1)];
                        continue r;
                      }
                      e2.msg = "invalid distance code", r2.mode = 30;
                      break e;
                    }
                    if (k = 65535 & v, p < (y &= 15) && (d += z[n++] << p, (p += 8) < y && (d += z[n++] << p, p += 8)), h < (k += d & (1 << y) - 1)) {
                      e2.msg = "invalid distance too far back", r2.mode = 30;
                      break e;
                    }
                    if (d >>>= y, p -= y, (y = s - a) < k) {
                      if (l < (y = k - y) && r2.sane) {
                        e2.msg = "invalid distance too far back", r2.mode = 30;
                        break e;
                      }
                      if (S = c, (x = 0) === f) {
                        if (x += u - y, y < w) {
                          for (w -= y; C[s++] = c[x++], --y; ) ;
                          x = s - k, S = C;
                        }
                      } else if (f < y) {
                        if (x += u + f - y, (y -= f) < w) {
                          for (w -= y; C[s++] = c[x++], --y; ) ;
                          if (x = 0, f < w) {
                            for (w -= y = f; C[s++] = c[x++], --y; ) ;
                            x = s - k, S = C;
                          }
                        }
                      } else if (x += f - y, y < w) {
                        for (w -= y; C[s++] = c[x++], --y; ) ;
                        x = s - k, S = C;
                      }
                      for (; 2 < w; ) C[s++] = S[x++], C[s++] = S[x++], C[s++] = S[x++], w -= 3;
                      w && (C[s++] = S[x++], 1 < w && (C[s++] = S[x++]));
                    } else {
                      for (x = s - k; C[s++] = C[x++], C[s++] = C[x++], C[s++] = C[x++], 2 < (w -= 3); ) ;
                      w && (C[s++] = C[x++], 1 < w && (C[s++] = C[x++]));
                    }
                    break;
                  }
                }
                break;
              }
            } while (n < i && s < o);
            n -= w = p >> 3, d &= (1 << (p -= w << 3)) - 1, e2.next_in = n, e2.next_out = s, e2.avail_in = n < i ? i - n + 5 : 5 - (n - i), e2.avail_out = s < o ? o - s + 257 : 257 - (s - o), r2.hold = d, r2.bits = p;
          };
        }, {}], 49: [function(e, t, r) {
          "use strict";
          var I = e("../utils/common"), O = e("./adler32"), B = e("./crc32"), R = e("./inffast"), T = e("./inftrees"), D = 1, F = 2, N = 0, U = -2, P = 1, n = 852, i = 592;
          function L(e2) {
            return (e2 >>> 24 & 255) + (e2 >>> 8 & 65280) + ((65280 & e2) << 8) + ((255 & e2) << 24);
          }
          function s() {
            this.mode = 0, this.last = false, this.wrap = 0, this.havedict = false, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new I.Buf16(320), this.work = new I.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
          }
          function a(e2) {
            var t2;
            return e2 && e2.state ? (t2 = e2.state, e2.total_in = e2.total_out = t2.total = 0, e2.msg = "", t2.wrap && (e2.adler = 1 & t2.wrap), t2.mode = P, t2.last = 0, t2.havedict = 0, t2.dmax = 32768, t2.head = null, t2.hold = 0, t2.bits = 0, t2.lencode = t2.lendyn = new I.Buf32(n), t2.distcode = t2.distdyn = new I.Buf32(i), t2.sane = 1, t2.back = -1, N) : U;
          }
          function o(e2) {
            var t2;
            return e2 && e2.state ? ((t2 = e2.state).wsize = 0, t2.whave = 0, t2.wnext = 0, a(e2)) : U;
          }
          function h(e2, t2) {
            var r2, n2;
            return e2 && e2.state ? (n2 = e2.state, t2 < 0 ? (r2 = 0, t2 = -t2) : (r2 = 1 + (t2 >> 4), t2 < 48 && (t2 &= 15)), t2 && (t2 < 8 || 15 < t2) ? U : (null !== n2.window && n2.wbits !== t2 && (n2.window = null), n2.wrap = r2, n2.wbits = t2, o(e2))) : U;
          }
          function u(e2, t2) {
            var r2, n2;
            return e2 ? (n2 = new s(), (e2.state = n2).window = null, (r2 = h(e2, t2)) !== N && (e2.state = null), r2) : U;
          }
          var l, f, c = true;
          function j(e2) {
            if (c) {
              var t2;
              for (l = new I.Buf32(512), f = new I.Buf32(32), t2 = 0; t2 < 144; ) e2.lens[t2++] = 8;
              for (; t2 < 256; ) e2.lens[t2++] = 9;
              for (; t2 < 280; ) e2.lens[t2++] = 7;
              for (; t2 < 288; ) e2.lens[t2++] = 8;
              for (T(D, e2.lens, 0, 288, l, 0, e2.work, { bits: 9 }), t2 = 0; t2 < 32; ) e2.lens[t2++] = 5;
              T(F, e2.lens, 0, 32, f, 0, e2.work, { bits: 5 }), c = false;
            }
            e2.lencode = l, e2.lenbits = 9, e2.distcode = f, e2.distbits = 5;
          }
          function Z(e2, t2, r2, n2) {
            var i2, s2 = e2.state;
            return null === s2.window && (s2.wsize = 1 << s2.wbits, s2.wnext = 0, s2.whave = 0, s2.window = new I.Buf8(s2.wsize)), n2 >= s2.wsize ? (I.arraySet(s2.window, t2, r2 - s2.wsize, s2.wsize, 0), s2.wnext = 0, s2.whave = s2.wsize) : (n2 < (i2 = s2.wsize - s2.wnext) && (i2 = n2), I.arraySet(s2.window, t2, r2 - n2, i2, s2.wnext), (n2 -= i2) ? (I.arraySet(s2.window, t2, r2 - n2, n2, 0), s2.wnext = n2, s2.whave = s2.wsize) : (s2.wnext += i2, s2.wnext === s2.wsize && (s2.wnext = 0), s2.whave < s2.wsize && (s2.whave += i2))), 0;
          }
          r.inflateReset = o, r.inflateReset2 = h, r.inflateResetKeep = a, r.inflateInit = function(e2) {
            return u(e2, 15);
          }, r.inflateInit2 = u, r.inflate = function(e2, t2) {
            var r2, n2, i2, s2, a2, o2, h2, u2, l2, f2, c2, d, p, m, _, g, b, v, y, w, k, x, S, z, C = 0, E = new I.Buf8(4), A = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
            if (!e2 || !e2.state || !e2.output || !e2.input && 0 !== e2.avail_in) return U;
            12 === (r2 = e2.state).mode && (r2.mode = 13), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, f2 = o2, c2 = h2, x = N;
            e: for (; ; ) switch (r2.mode) {
              case P:
                if (0 === r2.wrap) {
                  r2.mode = 13;
                  break;
                }
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (2 & r2.wrap && 35615 === u2) {
                  E[r2.check = 0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0), l2 = u2 = 0, r2.mode = 2;
                  break;
                }
                if (r2.flags = 0, r2.head && (r2.head.done = false), !(1 & r2.wrap) || (((255 & u2) << 8) + (u2 >> 8)) % 31) {
                  e2.msg = "incorrect header check", r2.mode = 30;
                  break;
                }
                if (8 != (15 & u2)) {
                  e2.msg = "unknown compression method", r2.mode = 30;
                  break;
                }
                if (l2 -= 4, k = 8 + (15 & (u2 >>>= 4)), 0 === r2.wbits) r2.wbits = k;
                else if (k > r2.wbits) {
                  e2.msg = "invalid window size", r2.mode = 30;
                  break;
                }
                r2.dmax = 1 << k, e2.adler = r2.check = 1, r2.mode = 512 & u2 ? 10 : 12, l2 = u2 = 0;
                break;
              case 2:
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (r2.flags = u2, 8 != (255 & r2.flags)) {
                  e2.msg = "unknown compression method", r2.mode = 30;
                  break;
                }
                if (57344 & r2.flags) {
                  e2.msg = "unknown header flags set", r2.mode = 30;
                  break;
                }
                r2.head && (r2.head.text = u2 >> 8 & 1), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 3;
              case 3:
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.head && (r2.head.time = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, E[2] = u2 >>> 16 & 255, E[3] = u2 >>> 24 & 255, r2.check = B(r2.check, E, 4, 0)), l2 = u2 = 0, r2.mode = 4;
              case 4:
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.head && (r2.head.xflags = 255 & u2, r2.head.os = u2 >> 8), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 5;
              case 5:
                if (1024 & r2.flags) {
                  for (; l2 < 16; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.length = u2, r2.head && (r2.head.extra_len = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0;
                } else r2.head && (r2.head.extra = null);
                r2.mode = 6;
              case 6:
                if (1024 & r2.flags && (o2 < (d = r2.length) && (d = o2), d && (r2.head && (k = r2.head.extra_len - r2.length, r2.head.extra || (r2.head.extra = new Array(r2.head.extra_len)), I.arraySet(r2.head.extra, n2, s2, d, k)), 512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, r2.length -= d), r2.length)) break e;
                r2.length = 0, r2.mode = 7;
              case 7:
                if (2048 & r2.flags) {
                  if (0 === o2) break e;
                  for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.name += String.fromCharCode(k)), k && d < o2; ) ;
                  if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
                } else r2.head && (r2.head.name = null);
                r2.length = 0, r2.mode = 8;
              case 8:
                if (4096 & r2.flags) {
                  if (0 === o2) break e;
                  for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.comment += String.fromCharCode(k)), k && d < o2; ) ;
                  if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
                } else r2.head && (r2.head.comment = null);
                r2.mode = 9;
              case 9:
                if (512 & r2.flags) {
                  for (; l2 < 16; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (u2 !== (65535 & r2.check)) {
                    e2.msg = "header crc mismatch", r2.mode = 30;
                    break;
                  }
                  l2 = u2 = 0;
                }
                r2.head && (r2.head.hcrc = r2.flags >> 9 & 1, r2.head.done = true), e2.adler = r2.check = 0, r2.mode = 12;
                break;
              case 10:
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                e2.adler = r2.check = L(u2), l2 = u2 = 0, r2.mode = 11;
              case 11:
                if (0 === r2.havedict) return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, 2;
                e2.adler = r2.check = 1, r2.mode = 12;
              case 12:
                if (5 === t2 || 6 === t2) break e;
              case 13:
                if (r2.last) {
                  u2 >>>= 7 & l2, l2 -= 7 & l2, r2.mode = 27;
                  break;
                }
                for (; l2 < 3; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                switch (r2.last = 1 & u2, l2 -= 1, 3 & (u2 >>>= 1)) {
                  case 0:
                    r2.mode = 14;
                    break;
                  case 1:
                    if (j(r2), r2.mode = 20, 6 !== t2) break;
                    u2 >>>= 2, l2 -= 2;
                    break e;
                  case 2:
                    r2.mode = 17;
                    break;
                  case 3:
                    e2.msg = "invalid block type", r2.mode = 30;
                }
                u2 >>>= 2, l2 -= 2;
                break;
              case 14:
                for (u2 >>>= 7 & l2, l2 -= 7 & l2; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if ((65535 & u2) != (u2 >>> 16 ^ 65535)) {
                  e2.msg = "invalid stored block lengths", r2.mode = 30;
                  break;
                }
                if (r2.length = 65535 & u2, l2 = u2 = 0, r2.mode = 15, 6 === t2) break e;
              case 15:
                r2.mode = 16;
              case 16:
                if (d = r2.length) {
                  if (o2 < d && (d = o2), h2 < d && (d = h2), 0 === d) break e;
                  I.arraySet(i2, n2, s2, d, a2), o2 -= d, s2 += d, h2 -= d, a2 += d, r2.length -= d;
                  break;
                }
                r2.mode = 12;
                break;
              case 17:
                for (; l2 < 14; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (r2.nlen = 257 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ndist = 1 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ncode = 4 + (15 & u2), u2 >>>= 4, l2 -= 4, 286 < r2.nlen || 30 < r2.ndist) {
                  e2.msg = "too many length or distance symbols", r2.mode = 30;
                  break;
                }
                r2.have = 0, r2.mode = 18;
              case 18:
                for (; r2.have < r2.ncode; ) {
                  for (; l2 < 3; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.lens[A[r2.have++]] = 7 & u2, u2 >>>= 3, l2 -= 3;
                }
                for (; r2.have < 19; ) r2.lens[A[r2.have++]] = 0;
                if (r2.lencode = r2.lendyn, r2.lenbits = 7, S = { bits: r2.lenbits }, x = T(0, r2.lens, 0, 19, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                  e2.msg = "invalid code lengths set", r2.mode = 30;
                  break;
                }
                r2.have = 0, r2.mode = 19;
              case 19:
                for (; r2.have < r2.nlen + r2.ndist; ) {
                  for (; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (b < 16) u2 >>>= _, l2 -= _, r2.lens[r2.have++] = b;
                  else {
                    if (16 === b) {
                      for (z = _ + 2; l2 < z; ) {
                        if (0 === o2) break e;
                        o2--, u2 += n2[s2++] << l2, l2 += 8;
                      }
                      if (u2 >>>= _, l2 -= _, 0 === r2.have) {
                        e2.msg = "invalid bit length repeat", r2.mode = 30;
                        break;
                      }
                      k = r2.lens[r2.have - 1], d = 3 + (3 & u2), u2 >>>= 2, l2 -= 2;
                    } else if (17 === b) {
                      for (z = _ + 3; l2 < z; ) {
                        if (0 === o2) break e;
                        o2--, u2 += n2[s2++] << l2, l2 += 8;
                      }
                      l2 -= _, k = 0, d = 3 + (7 & (u2 >>>= _)), u2 >>>= 3, l2 -= 3;
                    } else {
                      for (z = _ + 7; l2 < z; ) {
                        if (0 === o2) break e;
                        o2--, u2 += n2[s2++] << l2, l2 += 8;
                      }
                      l2 -= _, k = 0, d = 11 + (127 & (u2 >>>= _)), u2 >>>= 7, l2 -= 7;
                    }
                    if (r2.have + d > r2.nlen + r2.ndist) {
                      e2.msg = "invalid bit length repeat", r2.mode = 30;
                      break;
                    }
                    for (; d--; ) r2.lens[r2.have++] = k;
                  }
                }
                if (30 === r2.mode) break;
                if (0 === r2.lens[256]) {
                  e2.msg = "invalid code -- missing end-of-block", r2.mode = 30;
                  break;
                }
                if (r2.lenbits = 9, S = { bits: r2.lenbits }, x = T(D, r2.lens, 0, r2.nlen, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                  e2.msg = "invalid literal/lengths set", r2.mode = 30;
                  break;
                }
                if (r2.distbits = 6, r2.distcode = r2.distdyn, S = { bits: r2.distbits }, x = T(F, r2.lens, r2.nlen, r2.ndist, r2.distcode, 0, r2.work, S), r2.distbits = S.bits, x) {
                  e2.msg = "invalid distances set", r2.mode = 30;
                  break;
                }
                if (r2.mode = 20, 6 === t2) break e;
              case 20:
                r2.mode = 21;
              case 21:
                if (6 <= o2 && 258 <= h2) {
                  e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, R(e2, c2), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, 12 === r2.mode && (r2.back = -1);
                  break;
                }
                for (r2.back = 0; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (g && 0 == (240 & g)) {
                  for (v = _, y = g, w = b; g = (C = r2.lencode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  u2 >>>= v, l2 -= v, r2.back += v;
                }
                if (u2 >>>= _, l2 -= _, r2.back += _, r2.length = b, 0 === g) {
                  r2.mode = 26;
                  break;
                }
                if (32 & g) {
                  r2.back = -1, r2.mode = 12;
                  break;
                }
                if (64 & g) {
                  e2.msg = "invalid literal/length code", r2.mode = 30;
                  break;
                }
                r2.extra = 15 & g, r2.mode = 22;
              case 22:
                if (r2.extra) {
                  for (z = r2.extra; l2 < z; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.length += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
                }
                r2.was = r2.length, r2.mode = 23;
              case 23:
                for (; g = (C = r2.distcode[u2 & (1 << r2.distbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (0 == (240 & g)) {
                  for (v = _, y = g, w = b; g = (C = r2.distcode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  u2 >>>= v, l2 -= v, r2.back += v;
                }
                if (u2 >>>= _, l2 -= _, r2.back += _, 64 & g) {
                  e2.msg = "invalid distance code", r2.mode = 30;
                  break;
                }
                r2.offset = b, r2.extra = 15 & g, r2.mode = 24;
              case 24:
                if (r2.extra) {
                  for (z = r2.extra; l2 < z; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.offset += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
                }
                if (r2.offset > r2.dmax) {
                  e2.msg = "invalid distance too far back", r2.mode = 30;
                  break;
                }
                r2.mode = 25;
              case 25:
                if (0 === h2) break e;
                if (d = c2 - h2, r2.offset > d) {
                  if ((d = r2.offset - d) > r2.whave && r2.sane) {
                    e2.msg = "invalid distance too far back", r2.mode = 30;
                    break;
                  }
                  p = d > r2.wnext ? (d -= r2.wnext, r2.wsize - d) : r2.wnext - d, d > r2.length && (d = r2.length), m = r2.window;
                } else m = i2, p = a2 - r2.offset, d = r2.length;
                for (h2 < d && (d = h2), h2 -= d, r2.length -= d; i2[a2++] = m[p++], --d; ) ;
                0 === r2.length && (r2.mode = 21);
                break;
              case 26:
                if (0 === h2) break e;
                i2[a2++] = r2.length, h2--, r2.mode = 21;
                break;
              case 27:
                if (r2.wrap) {
                  for (; l2 < 32; ) {
                    if (0 === o2) break e;
                    o2--, u2 |= n2[s2++] << l2, l2 += 8;
                  }
                  if (c2 -= h2, e2.total_out += c2, r2.total += c2, c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, a2 - c2) : O(r2.check, i2, c2, a2 - c2)), c2 = h2, (r2.flags ? u2 : L(u2)) !== r2.check) {
                    e2.msg = "incorrect data check", r2.mode = 30;
                    break;
                  }
                  l2 = u2 = 0;
                }
                r2.mode = 28;
              case 28:
                if (r2.wrap && r2.flags) {
                  for (; l2 < 32; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (u2 !== (4294967295 & r2.total)) {
                    e2.msg = "incorrect length check", r2.mode = 30;
                    break;
                  }
                  l2 = u2 = 0;
                }
                r2.mode = 29;
              case 29:
                x = 1;
                break e;
              case 30:
                x = -3;
                break e;
              case 31:
                return -4;
              case 32:
              default:
                return U;
            }
            return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, (r2.wsize || c2 !== e2.avail_out && r2.mode < 30 && (r2.mode < 27 || 4 !== t2)) && Z(e2, e2.output, e2.next_out, c2 - e2.avail_out) ? (r2.mode = 31, -4) : (f2 -= e2.avail_in, c2 -= e2.avail_out, e2.total_in += f2, e2.total_out += c2, r2.total += c2, r2.wrap && c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, e2.next_out - c2) : O(r2.check, i2, c2, e2.next_out - c2)), e2.data_type = r2.bits + (r2.last ? 64 : 0) + (12 === r2.mode ? 128 : 0) + (20 === r2.mode || 15 === r2.mode ? 256 : 0), (0 == f2 && 0 === c2 || 4 === t2) && x === N && (x = -5), x);
          }, r.inflateEnd = function(e2) {
            if (!e2 || !e2.state) return U;
            var t2 = e2.state;
            return t2.window && (t2.window = null), e2.state = null, N;
          }, r.inflateGetHeader = function(e2, t2) {
            var r2;
            return e2 && e2.state ? 0 == (2 & (r2 = e2.state).wrap) ? U : ((r2.head = t2).done = false, N) : U;
          }, r.inflateSetDictionary = function(e2, t2) {
            var r2, n2 = t2.length;
            return e2 && e2.state ? 0 !== (r2 = e2.state).wrap && 11 !== r2.mode ? U : 11 === r2.mode && O(1, t2, n2, 0) !== r2.check ? -3 : Z(e2, t2, n2, n2) ? (r2.mode = 31, -4) : (r2.havedict = 1, N) : U;
          }, r.inflateInfo = "pako inflate (from Nodeca project)";
        }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, t, r) {
          "use strict";
          var D = e("../utils/common"), F = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], N = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], U = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], P = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
          t.exports = function(e2, t2, r2, n, i, s, a, o) {
            var h, u, l, f, c, d, p, m, _, g = o.bits, b = 0, v = 0, y = 0, w = 0, k = 0, x = 0, S = 0, z = 0, C = 0, E = 0, A = null, I = 0, O = new D.Buf16(16), B = new D.Buf16(16), R = null, T = 0;
            for (b = 0; b <= 15; b++) O[b] = 0;
            for (v = 0; v < n; v++) O[t2[r2 + v]]++;
            for (k = g, w = 15; 1 <= w && 0 === O[w]; w--) ;
            if (w < k && (k = w), 0 === w) return i[s++] = 20971520, i[s++] = 20971520, o.bits = 1, 0;
            for (y = 1; y < w && 0 === O[y]; y++) ;
            for (k < y && (k = y), b = z = 1; b <= 15; b++) if (z <<= 1, (z -= O[b]) < 0) return -1;
            if (0 < z && (0 === e2 || 1 !== w)) return -1;
            for (B[1] = 0, b = 1; b < 15; b++) B[b + 1] = B[b] + O[b];
            for (v = 0; v < n; v++) 0 !== t2[r2 + v] && (a[B[t2[r2 + v]]++] = v);
            if (d = 0 === e2 ? (A = R = a, 19) : 1 === e2 ? (A = F, I -= 257, R = N, T -= 257, 256) : (A = U, R = P, -1), b = y, c = s, S = v = E = 0, l = -1, f = (C = 1 << (x = k)) - 1, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
            for (; ; ) {
              for (p = b - S, _ = a[v] < d ? (m = 0, a[v]) : a[v] > d ? (m = R[T + a[v]], A[I + a[v]]) : (m = 96, 0), h = 1 << b - S, y = u = 1 << x; i[c + (E >> S) + (u -= h)] = p << 24 | m << 16 | _ | 0, 0 !== u; ) ;
              for (h = 1 << b - 1; E & h; ) h >>= 1;
              if (0 !== h ? (E &= h - 1, E += h) : E = 0, v++, 0 == --O[b]) {
                if (b === w) break;
                b = t2[r2 + a[v]];
              }
              if (k < b && (E & f) !== l) {
                for (0 === S && (S = k), c += y, z = 1 << (x = b - S); x + S < w && !((z -= O[x + S]) <= 0); ) x++, z <<= 1;
                if (C += 1 << x, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
                i[l = E & f] = k << 24 | x << 16 | c - s | 0;
              }
            }
            return 0 !== E && (i[c + E] = b - S << 24 | 64 << 16 | 0), o.bits = k, 0;
          };
        }, { "../utils/common": 41 }], 51: [function(e, t, r) {
          "use strict";
          t.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
        }, {}], 52: [function(e, t, r) {
          "use strict";
          var i = e("../utils/common"), o = 0, h = 1;
          function n(e2) {
            for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
          }
          var s = 0, a = 29, u = 256, l = u + 1 + a, f = 30, c = 19, _ = 2 * l + 1, g = 15, d = 16, p = 7, m = 256, b = 16, v = 17, y = 18, w = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], k = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], S = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], z = new Array(2 * (l + 2));
          n(z);
          var C = new Array(2 * f);
          n(C);
          var E = new Array(512);
          n(E);
          var A = new Array(256);
          n(A);
          var I = new Array(a);
          n(I);
          var O, B, R, T = new Array(f);
          function D(e2, t2, r2, n2, i2) {
            this.static_tree = e2, this.extra_bits = t2, this.extra_base = r2, this.elems = n2, this.max_length = i2, this.has_stree = e2 && e2.length;
          }
          function F(e2, t2) {
            this.dyn_tree = e2, this.max_code = 0, this.stat_desc = t2;
          }
          function N(e2) {
            return e2 < 256 ? E[e2] : E[256 + (e2 >>> 7)];
          }
          function U(e2, t2) {
            e2.pending_buf[e2.pending++] = 255 & t2, e2.pending_buf[e2.pending++] = t2 >>> 8 & 255;
          }
          function P(e2, t2, r2) {
            e2.bi_valid > d - r2 ? (e2.bi_buf |= t2 << e2.bi_valid & 65535, U(e2, e2.bi_buf), e2.bi_buf = t2 >> d - e2.bi_valid, e2.bi_valid += r2 - d) : (e2.bi_buf |= t2 << e2.bi_valid & 65535, e2.bi_valid += r2);
          }
          function L(e2, t2, r2) {
            P(e2, r2[2 * t2], r2[2 * t2 + 1]);
          }
          function j(e2, t2) {
            for (var r2 = 0; r2 |= 1 & e2, e2 >>>= 1, r2 <<= 1, 0 < --t2; ) ;
            return r2 >>> 1;
          }
          function Z(e2, t2, r2) {
            var n2, i2, s2 = new Array(g + 1), a2 = 0;
            for (n2 = 1; n2 <= g; n2++) s2[n2] = a2 = a2 + r2[n2 - 1] << 1;
            for (i2 = 0; i2 <= t2; i2++) {
              var o2 = e2[2 * i2 + 1];
              0 !== o2 && (e2[2 * i2] = j(s2[o2]++, o2));
            }
          }
          function W(e2) {
            var t2;
            for (t2 = 0; t2 < l; t2++) e2.dyn_ltree[2 * t2] = 0;
            for (t2 = 0; t2 < f; t2++) e2.dyn_dtree[2 * t2] = 0;
            for (t2 = 0; t2 < c; t2++) e2.bl_tree[2 * t2] = 0;
            e2.dyn_ltree[2 * m] = 1, e2.opt_len = e2.static_len = 0, e2.last_lit = e2.matches = 0;
          }
          function M(e2) {
            8 < e2.bi_valid ? U(e2, e2.bi_buf) : 0 < e2.bi_valid && (e2.pending_buf[e2.pending++] = e2.bi_buf), e2.bi_buf = 0, e2.bi_valid = 0;
          }
          function H(e2, t2, r2, n2) {
            var i2 = 2 * t2, s2 = 2 * r2;
            return e2[i2] < e2[s2] || e2[i2] === e2[s2] && n2[t2] <= n2[r2];
          }
          function G(e2, t2, r2) {
            for (var n2 = e2.heap[r2], i2 = r2 << 1; i2 <= e2.heap_len && (i2 < e2.heap_len && H(t2, e2.heap[i2 + 1], e2.heap[i2], e2.depth) && i2++, !H(t2, n2, e2.heap[i2], e2.depth)); ) e2.heap[r2] = e2.heap[i2], r2 = i2, i2 <<= 1;
            e2.heap[r2] = n2;
          }
          function K(e2, t2, r2) {
            var n2, i2, s2, a2, o2 = 0;
            if (0 !== e2.last_lit) for (; n2 = e2.pending_buf[e2.d_buf + 2 * o2] << 8 | e2.pending_buf[e2.d_buf + 2 * o2 + 1], i2 = e2.pending_buf[e2.l_buf + o2], o2++, 0 === n2 ? L(e2, i2, t2) : (L(e2, (s2 = A[i2]) + u + 1, t2), 0 !== (a2 = w[s2]) && P(e2, i2 -= I[s2], a2), L(e2, s2 = N(--n2), r2), 0 !== (a2 = k[s2]) && P(e2, n2 -= T[s2], a2)), o2 < e2.last_lit; ) ;
            L(e2, m, t2);
          }
          function Y(e2, t2) {
            var r2, n2, i2, s2 = t2.dyn_tree, a2 = t2.stat_desc.static_tree, o2 = t2.stat_desc.has_stree, h2 = t2.stat_desc.elems, u2 = -1;
            for (e2.heap_len = 0, e2.heap_max = _, r2 = 0; r2 < h2; r2++) 0 !== s2[2 * r2] ? (e2.heap[++e2.heap_len] = u2 = r2, e2.depth[r2] = 0) : s2[2 * r2 + 1] = 0;
            for (; e2.heap_len < 2; ) s2[2 * (i2 = e2.heap[++e2.heap_len] = u2 < 2 ? ++u2 : 0)] = 1, e2.depth[i2] = 0, e2.opt_len--, o2 && (e2.static_len -= a2[2 * i2 + 1]);
            for (t2.max_code = u2, r2 = e2.heap_len >> 1; 1 <= r2; r2--) G(e2, s2, r2);
            for (i2 = h2; r2 = e2.heap[1], e2.heap[1] = e2.heap[e2.heap_len--], G(e2, s2, 1), n2 = e2.heap[1], e2.heap[--e2.heap_max] = r2, e2.heap[--e2.heap_max] = n2, s2[2 * i2] = s2[2 * r2] + s2[2 * n2], e2.depth[i2] = (e2.depth[r2] >= e2.depth[n2] ? e2.depth[r2] : e2.depth[n2]) + 1, s2[2 * r2 + 1] = s2[2 * n2 + 1] = i2, e2.heap[1] = i2++, G(e2, s2, 1), 2 <= e2.heap_len; ) ;
            e2.heap[--e2.heap_max] = e2.heap[1], (function(e3, t3) {
              var r3, n3, i3, s3, a3, o3, h3 = t3.dyn_tree, u3 = t3.max_code, l2 = t3.stat_desc.static_tree, f2 = t3.stat_desc.has_stree, c2 = t3.stat_desc.extra_bits, d2 = t3.stat_desc.extra_base, p2 = t3.stat_desc.max_length, m2 = 0;
              for (s3 = 0; s3 <= g; s3++) e3.bl_count[s3] = 0;
              for (h3[2 * e3.heap[e3.heap_max] + 1] = 0, r3 = e3.heap_max + 1; r3 < _; r3++) p2 < (s3 = h3[2 * h3[2 * (n3 = e3.heap[r3]) + 1] + 1] + 1) && (s3 = p2, m2++), h3[2 * n3 + 1] = s3, u3 < n3 || (e3.bl_count[s3]++, a3 = 0, d2 <= n3 && (a3 = c2[n3 - d2]), o3 = h3[2 * n3], e3.opt_len += o3 * (s3 + a3), f2 && (e3.static_len += o3 * (l2[2 * n3 + 1] + a3)));
              if (0 !== m2) {
                do {
                  for (s3 = p2 - 1; 0 === e3.bl_count[s3]; ) s3--;
                  e3.bl_count[s3]--, e3.bl_count[s3 + 1] += 2, e3.bl_count[p2]--, m2 -= 2;
                } while (0 < m2);
                for (s3 = p2; 0 !== s3; s3--) for (n3 = e3.bl_count[s3]; 0 !== n3; ) u3 < (i3 = e3.heap[--r3]) || (h3[2 * i3 + 1] !== s3 && (e3.opt_len += (s3 - h3[2 * i3 + 1]) * h3[2 * i3], h3[2 * i3 + 1] = s3), n3--);
              }
            })(e2, t2), Z(s2, u2, e2.bl_count);
          }
          function X(e2, t2, r2) {
            var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
            for (0 === a2 && (h2 = 138, u2 = 3), t2[2 * (r2 + 1) + 1] = 65535, n2 = 0; n2 <= r2; n2++) i2 = a2, a2 = t2[2 * (n2 + 1) + 1], ++o2 < h2 && i2 === a2 || (o2 < u2 ? e2.bl_tree[2 * i2] += o2 : 0 !== i2 ? (i2 !== s2 && e2.bl_tree[2 * i2]++, e2.bl_tree[2 * b]++) : o2 <= 10 ? e2.bl_tree[2 * v]++ : e2.bl_tree[2 * y]++, s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4));
          }
          function V(e2, t2, r2) {
            var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
            for (0 === a2 && (h2 = 138, u2 = 3), n2 = 0; n2 <= r2; n2++) if (i2 = a2, a2 = t2[2 * (n2 + 1) + 1], !(++o2 < h2 && i2 === a2)) {
              if (o2 < u2) for (; L(e2, i2, e2.bl_tree), 0 != --o2; ) ;
              else 0 !== i2 ? (i2 !== s2 && (L(e2, i2, e2.bl_tree), o2--), L(e2, b, e2.bl_tree), P(e2, o2 - 3, 2)) : o2 <= 10 ? (L(e2, v, e2.bl_tree), P(e2, o2 - 3, 3)) : (L(e2, y, e2.bl_tree), P(e2, o2 - 11, 7));
              s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4);
            }
          }
          n(T);
          var q = false;
          function J(e2, t2, r2, n2) {
            P(e2, (s << 1) + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
              M(e3), n3 && (U(e3, r3), U(e3, ~r3)), i.arraySet(e3.pending_buf, e3.window, t3, r3, e3.pending), e3.pending += r3;
            })(e2, t2, r2, true);
          }
          r._tr_init = function(e2) {
            q || ((function() {
              var e3, t2, r2, n2, i2, s2 = new Array(g + 1);
              for (n2 = r2 = 0; n2 < a - 1; n2++) for (I[n2] = r2, e3 = 0; e3 < 1 << w[n2]; e3++) A[r2++] = n2;
              for (A[r2 - 1] = n2, n2 = i2 = 0; n2 < 16; n2++) for (T[n2] = i2, e3 = 0; e3 < 1 << k[n2]; e3++) E[i2++] = n2;
              for (i2 >>= 7; n2 < f; n2++) for (T[n2] = i2 << 7, e3 = 0; e3 < 1 << k[n2] - 7; e3++) E[256 + i2++] = n2;
              for (t2 = 0; t2 <= g; t2++) s2[t2] = 0;
              for (e3 = 0; e3 <= 143; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
              for (; e3 <= 255; ) z[2 * e3 + 1] = 9, e3++, s2[9]++;
              for (; e3 <= 279; ) z[2 * e3 + 1] = 7, e3++, s2[7]++;
              for (; e3 <= 287; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
              for (Z(z, l + 1, s2), e3 = 0; e3 < f; e3++) C[2 * e3 + 1] = 5, C[2 * e3] = j(e3, 5);
              O = new D(z, w, u + 1, l, g), B = new D(C, k, 0, f, g), R = new D(new Array(0), x, 0, c, p);
            })(), q = true), e2.l_desc = new F(e2.dyn_ltree, O), e2.d_desc = new F(e2.dyn_dtree, B), e2.bl_desc = new F(e2.bl_tree, R), e2.bi_buf = 0, e2.bi_valid = 0, W(e2);
          }, r._tr_stored_block = J, r._tr_flush_block = function(e2, t2, r2, n2) {
            var i2, s2, a2 = 0;
            0 < e2.level ? (2 === e2.strm.data_type && (e2.strm.data_type = (function(e3) {
              var t3, r3 = 4093624447;
              for (t3 = 0; t3 <= 31; t3++, r3 >>>= 1) if (1 & r3 && 0 !== e3.dyn_ltree[2 * t3]) return o;
              if (0 !== e3.dyn_ltree[18] || 0 !== e3.dyn_ltree[20] || 0 !== e3.dyn_ltree[26]) return h;
              for (t3 = 32; t3 < u; t3++) if (0 !== e3.dyn_ltree[2 * t3]) return h;
              return o;
            })(e2)), Y(e2, e2.l_desc), Y(e2, e2.d_desc), a2 = (function(e3) {
              var t3;
              for (X(e3, e3.dyn_ltree, e3.l_desc.max_code), X(e3, e3.dyn_dtree, e3.d_desc.max_code), Y(e3, e3.bl_desc), t3 = c - 1; 3 <= t3 && 0 === e3.bl_tree[2 * S[t3] + 1]; t3--) ;
              return e3.opt_len += 3 * (t3 + 1) + 5 + 5 + 4, t3;
            })(e2), i2 = e2.opt_len + 3 + 7 >>> 3, (s2 = e2.static_len + 3 + 7 >>> 3) <= i2 && (i2 = s2)) : i2 = s2 = r2 + 5, r2 + 4 <= i2 && -1 !== t2 ? J(e2, t2, r2, n2) : 4 === e2.strategy || s2 === i2 ? (P(e2, 2 + (n2 ? 1 : 0), 3), K(e2, z, C)) : (P(e2, 4 + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
              var i3;
              for (P(e3, t3 - 257, 5), P(e3, r3 - 1, 5), P(e3, n3 - 4, 4), i3 = 0; i3 < n3; i3++) P(e3, e3.bl_tree[2 * S[i3] + 1], 3);
              V(e3, e3.dyn_ltree, t3 - 1), V(e3, e3.dyn_dtree, r3 - 1);
            })(e2, e2.l_desc.max_code + 1, e2.d_desc.max_code + 1, a2 + 1), K(e2, e2.dyn_ltree, e2.dyn_dtree)), W(e2), n2 && M(e2);
          }, r._tr_tally = function(e2, t2, r2) {
            return e2.pending_buf[e2.d_buf + 2 * e2.last_lit] = t2 >>> 8 & 255, e2.pending_buf[e2.d_buf + 2 * e2.last_lit + 1] = 255 & t2, e2.pending_buf[e2.l_buf + e2.last_lit] = 255 & r2, e2.last_lit++, 0 === t2 ? e2.dyn_ltree[2 * r2]++ : (e2.matches++, t2--, e2.dyn_ltree[2 * (A[r2] + u + 1)]++, e2.dyn_dtree[2 * N(t2)]++), e2.last_lit === e2.lit_bufsize - 1;
          }, r._tr_align = function(e2) {
            P(e2, 2, 3), L(e2, m, z), (function(e3) {
              16 === e3.bi_valid ? (U(e3, e3.bi_buf), e3.bi_buf = 0, e3.bi_valid = 0) : 8 <= e3.bi_valid && (e3.pending_buf[e3.pending++] = 255 & e3.bi_buf, e3.bi_buf >>= 8, e3.bi_valid -= 8);
            })(e2);
          };
        }, { "../utils/common": 41 }], 53: [function(e, t, r) {
          "use strict";
          t.exports = function() {
            this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
          };
        }, {}], 54: [function(e, t, r) {
          (function(e2) {
            !(function(r2, n) {
              "use strict";
              if (!r2.setImmediate) {
                var i, s, t2, a, o = 1, h = {}, u = false, l = r2.document, e3 = Object.getPrototypeOf && Object.getPrototypeOf(r2);
                e3 = e3 && e3.setTimeout ? e3 : r2, i = "[object process]" === {}.toString.call(r2.process) ? function(e4) {
                  process.nextTick(function() {
                    c(e4);
                  });
                } : (function() {
                  if (r2.postMessage && !r2.importScripts) {
                    var e4 = true, t3 = r2.onmessage;
                    return r2.onmessage = function() {
                      e4 = false;
                    }, r2.postMessage("", "*"), r2.onmessage = t3, e4;
                  }
                })() ? (a = "setImmediate$" + Math.random() + "$", r2.addEventListener ? r2.addEventListener("message", d, false) : r2.attachEvent("onmessage", d), function(e4) {
                  r2.postMessage(a + e4, "*");
                }) : r2.MessageChannel ? ((t2 = new MessageChannel()).port1.onmessage = function(e4) {
                  c(e4.data);
                }, function(e4) {
                  t2.port2.postMessage(e4);
                }) : l && "onreadystatechange" in l.createElement("script") ? (s = l.documentElement, function(e4) {
                  var t3 = l.createElement("script");
                  t3.onreadystatechange = function() {
                    c(e4), t3.onreadystatechange = null, s.removeChild(t3), t3 = null;
                  }, s.appendChild(t3);
                }) : function(e4) {
                  setTimeout(c, 0, e4);
                }, e3.setImmediate = function(e4) {
                  "function" != typeof e4 && (e4 = new Function("" + e4));
                  for (var t3 = new Array(arguments.length - 1), r3 = 0; r3 < t3.length; r3++) t3[r3] = arguments[r3 + 1];
                  var n2 = { callback: e4, args: t3 };
                  return h[o] = n2, i(o), o++;
                }, e3.clearImmediate = f;
              }
              function f(e4) {
                delete h[e4];
              }
              function c(e4) {
                if (u) setTimeout(c, 0, e4);
                else {
                  var t3 = h[e4];
                  if (t3) {
                    u = true;
                    try {
                      !(function(e5) {
                        var t4 = e5.callback, r3 = e5.args;
                        switch (r3.length) {
                          case 0:
                            t4();
                            break;
                          case 1:
                            t4(r3[0]);
                            break;
                          case 2:
                            t4(r3[0], r3[1]);
                            break;
                          case 3:
                            t4(r3[0], r3[1], r3[2]);
                            break;
                          default:
                            t4.apply(n, r3);
                        }
                      })(t3);
                    } finally {
                      f(e4), u = false;
                    }
                  }
                }
              }
              function d(e4) {
                e4.source === r2 && "string" == typeof e4.data && 0 === e4.data.indexOf(a) && c(+e4.data.slice(a.length));
              }
            })("undefined" == typeof self ? void 0 === e2 ? this : e2 : self);
          }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
        }, {}] }, {}, [10])(10);
      });
    }
  });

  // src/utils/storage.js
  var Storage = {
    /**
     * Memeriksa apakah context extension masih valid dan aktif
     */
    isContextValid() {
      try {
        return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
      } catch {
        return false;
      }
    },
    /**
     * Mengambil satu atau beberapa nilai dari chrome.storage.local
     */
    async get(keys, defaults = {}) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading storage:", chrome.runtime.lastError.message);
                resolve(this._getLocalStorageFallback(keys, defaults));
              } else {
                resolve(Object.assign({}, defaults, result));
              }
            });
          } else {
            resolve(this._getLocalStorageFallback(keys, defaults));
          }
        } catch (e) {
          if (e.message && e.message.includes("Extension context invalidated")) {
            console.warn("[Storage] Extension context invalidated (ekstensi baru di-reload). Menggunakan fallback lokal.");
          } else {
            console.error("[Storage] Get failed:", e);
          }
          resolve(this._getLocalStorageFallback(keys, defaults));
        }
      });
    },
    /**
     * Menyimpan pasangan key-value ke chrome.storage.local
     */
    async set(items) {
      return new Promise((resolve, reject) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
              this._setLocalStorageFallback(items);
              resolve(true);
            });
          } else {
            this._setLocalStorageFallback(items);
            resolve(true);
          }
        } catch (e) {
          this._setLocalStorageFallback(items);
          resolve(true);
        }
      });
    },
    /**
     * Menghapus satu atau beberapa keys dari chrome.storage.local
     */
    async remove(keys) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(keys, () => resolve(true));
          } else {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach((k) => {
              try {
                localStorage.removeItem(k);
              } catch {
              }
            });
            resolve(true);
          }
        } catch {
          resolve(true);
        }
      });
    },
    /**
     * Mengambil semua data dari chrome.storage.local (atau fallback localStorage)
     */
    async getAll() {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading all storage:", chrome.runtime.lastError.message);
                resolve(this._getAllLocalStorageFallback());
              } else {
                resolve(result || {});
              }
            });
          } else {
            resolve(this._getAllLocalStorageFallback());
          }
        } catch (e) {
          resolve(this._getAllLocalStorageFallback());
        }
      });
    },
    _getAllLocalStorageFallback() {
      const res = {};
      if (typeof localStorage === "undefined") return res;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        try {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try {
              res[k] = JSON.parse(val);
            } catch {
              res[k] = val;
            }
          }
        } catch {
        }
      }
      return res;
    },
    _getLocalStorageFallback(keys, defaults = {}) {
      const res = Object.assign({}, defaults);
      if (typeof localStorage === "undefined") return res;
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        try {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try {
              res[k] = JSON.parse(val);
            } catch {
              res[k] = val;
            }
          }
        } catch {
        }
      });
      return res;
    },
    _setLocalStorageFallback(items) {
      if (typeof localStorage === "undefined") return;
      for (const [k, v] of Object.entries(items)) {
        try {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        } catch {
        }
      }
    },
    /**
     * Auto-migrasi transparan dari localStorage lama ke chrome.storage.local.
     * Dipanggil saat ekstensi pertama kali aktif.
     */
    async autoMigrateLegacyStorage() {
      try {
        if (typeof window === "undefined" || !window.localStorage) return;
        const { mentari_legacy_migrated } = await this.get("mentari_legacy_migrated", { mentari_legacy_migrated: false });
        if (mentari_legacy_migrated) return;
        const legacyKeys = [
          "mentari_auth_token",
          "mentari_user_info",
          "mentari_course_data",
          "geminiApiKey",
          "gemini_model",
          "gemini_quota",
          "mentari_auto_finish_quiz",
          "access"
        ];
        const validModels = [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3-flash",
          "gemini-3.1-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
          "gemini-3.7-flash",
          "gemini-3.8-flash"
        ];
        const toMigrate = {};
        let hasData = false;
        const existing = await this.get(["gemini_model", "geminiApiKey"]);
        for (const k of legacyKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (k === "geminiApiKey") {
                if (!existing.geminiApiKey) {
                  try {
                    toMigrate[k] = atob(raw);
                  } catch {
                    toMigrate[k] = raw;
                  }
                  hasData = true;
                }
              } else if (k === "gemini_model") {
                let parsedModel = raw;
                try {
                  parsedModel = JSON.parse(raw);
                } catch {
                }
                if (!existing.gemini_model && validModels.includes(parsedModel)) {
                  toMigrate[k] = parsedModel;
                  hasData = true;
                }
              } else {
                if (!existing[k]) {
                  toMigrate[k] = JSON.parse(raw);
                  hasData = true;
                }
              }
            } catch {
              if (!existing[k]) {
                toMigrate[k] = raw;
                hasData = true;
              }
            }
          }
        }
        toMigrate.mentari_legacy_migrated = true;
        await this.set(toMigrate);
        console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/unpam-auth.js
  var UnpamAuth = {
    _cachedToken: null,
    _snifferInjected: false,
    /**
     * Mendekode payload JWT secara aman dengan normalisasi Base64URL
     */
    decodeJwtPayload(token) {
      if (!token || typeof token !== "string") return null;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      try {
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const jsonStr = decodeURIComponent(
          atob(b64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
        );
        return JSON.parse(jsonStr);
      } catch (e) {
        return null;
      }
    },
    /**
     * Memeriksa validitas dan masa berlaku (exp) token JWT
     */
    isTokenValid(token) {
      if (!token || typeof token !== "string") return false;
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        const parts = token.split(".");
        return parts.length === 3 && parts[1].length > 10;
      }
      if (typeof payload.exp === "number") {
        const isExpired = payload.exp * 1e3 <= Date.now() + 3e4;
        if (isExpired) {
          console.log("[UnpamAuth] Token kedaluwarsa (exp:", payload.exp, "now:", Math.floor(Date.now() / 1e3), ")");
          return false;
        }
      }
      return true;
    },
    /**
     * Mendapatkan identitas mahasiswa (NIM/ID) dari payload token
     */
    getUserIdentifier(token) {
      const payload = this.decodeJwtPayload(token);
      return payload?.nim || payload?.username || payload?.id || payload?.sub || "default";
    },
    /**
     * Menghapus token usang/tidak valid dari memori dan storage
     */
    clearInvalidToken() {
      this._cachedToken = null;
      if (typeof window !== "undefined") {
        delete window.lastAuthToken;
        try {
          window.dispatchEvent(new CustomEvent("mentari-token-invalidated"));
        } catch {
        }
      }
      try {
        localStorage.removeItem("mentari_auth_token");
        sessionStorage.removeItem("mentari_auth_token");
      } catch {
      }
      Storage.remove(["mentari_auth_token", "access"]);
    },
    /**
     * Mengambil token autentikasi (JWT) mahasiswa dari berbagai sumber
     */
    async getAuthToken() {
      if (this._cachedToken) {
        if (this.isTokenValid(this._cachedToken)) {
          return this._cachedToken;
        }
        this.clearInvalidToken();
      }
      if (typeof window !== "undefined" && window.lastAuthToken) {
        if (this.isTokenValid(window.lastAuthToken)) {
          this._cachedToken = window.lastAuthToken;
          return this._cachedToken;
        }
        delete window.lastAuthToken;
      }
      if (typeof localStorage !== "undefined") {
        const directLocal = localStorage.getItem("mentari_auth_token");
        if (directLocal && directLocal.startsWith("eyJ")) {
          if (this.isTokenValid(directLocal)) {
            this._saveCapturedToken(directLocal);
            return directLocal;
          } else {
            try {
              localStorage.removeItem("mentari_auth_token");
            } catch {
            }
          }
        }
      }
      const stored = await Storage.get(["mentari_auth_token", "access"]);
      if (stored.mentari_auth_token) {
        if (this.isTokenValid(stored.mentari_auth_token)) {
          this._cachedToken = stored.mentari_auth_token;
          return this._cachedToken;
        } else {
          Storage.remove("mentari_auth_token");
        }
      }
      if (stored.access) {
        if (this.isTokenValid(stored.access)) {
          this._cachedToken = stored.access;
          return this._cachedToken;
        } else {
          Storage.remove("access");
        }
      }
      if (typeof localStorage !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan localStorage info:", e.message);
        }
      }
      if (typeof sessionStorage !== "undefined") {
        try {
          const directSession = sessionStorage.getItem("mentari_auth_token");
          if (directSession && directSession.startsWith("eyJ") && this.isTokenValid(directSession)) {
            this._saveCapturedToken(directSession);
            return directSession;
          }
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const val = sessionStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan sessionStorage info:", e.message);
        }
      }
      if (typeof document !== "undefined" && document.cookie) {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const parts = cookie.trim().split("=");
          if (parts.length >= 2) {
            const cVal = decodeURIComponent(parts.slice(1).join("="));
            if (cVal.includes("eyJ")) {
              const extracted = this._extractJwtFromValue(cVal);
              if (extracted && this.isTokenValid(extracted)) {
                this._saveCapturedToken(extracted);
                return extracted;
              }
            }
          }
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
      }
      return null;
    },
    /**
     * Mengambil XSRF-TOKEN dari cookie untuk MyUnpam
     */
    getXsrfToken() {
      if (typeof document === "undefined" || !document.cookie) return "";
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const trimmed = c.trim();
        if (trimmed.startsWith("XSRF-TOKEN=")) {
          return decodeURIComponent(trimmed.substring(11));
        }
      }
      return "";
    },
    /**
     * Menyiapkan opsi header lengkap untuk request ke API UNPAM
     */
    async getFetchOptions(extraHeaders = {}) {
      const token = await this.getAuthToken();
      const xsrf = this.getXsrfToken();
      const headers = {
        "Accept": "application/json, text/plain, */*",
        ...extraHeaders
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
      }
      return {
        headers,
        credentials: "include"
      };
    },
    /**
     * Pasang pendengar event dari Main World Sniffer dan fallback DOM injection
     */
    installLiveSniffer() {
      if (typeof window === "undefined") return;
      const self2 = this;
      window.addEventListener("mentari-token-captured", (e) => {
        const token = e.detail?.token || e.detail;
        if (token && typeof token === "string") {
          self2._saveCapturedToken(token);
        }
      });
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "MENTARI_TOKEN_CAPTURED" && e.data.token) {
          self2._saveCapturedToken(e.data.token);
        }
      });
      if (!this._snifferInjected && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
        this._snifferInjected = true;
        try {
          const scriptId = "mentari-injected-sniffer";
          if (!document.getElementById(scriptId)) {
            const s = document.createElement("script");
            s.id = scriptId;
            const isDist = chrome.runtime.getURL("manifest.json").includes("/dist/") || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith("dist/");
            s.src = chrome.runtime.getURL(isDist ? "content/main-sniffer.js" : "dist/content/main-sniffer.js");
            (document.head || document.documentElement).appendChild(s);
          }
        } catch (err) {
          console.log("[UnpamAuth] Fallback sniffer injection notice:", err.message);
        }
      }
      if (window.XMLHttpRequest && XMLHttpRequest.prototype.setRequestHeader) {
        const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
          if (header && typeof header === "string" && header.toLowerCase() === "authorization") {
            if (value && typeof value === "string" && value.includes("Bearer ")) {
              const token = value.split("Bearer ")[1]?.trim();
              if (token && token.startsWith("eyJ")) {
                self2._saveCapturedToken(token);
              }
            }
          }
          return originalSetHeader.apply(this, arguments);
        };
      }
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function(resource, config) {
          try {
            if (config && config.headers) {
              let authHeader = null;
              if (config.headers instanceof Headers) {
                authHeader = config.headers.get("authorization") || config.headers.get("Authorization");
              } else if (typeof config.headers === "object") {
                authHeader = config.headers["authorization"] || config.headers["Authorization"];
              }
              if (authHeader && typeof authHeader === "string" && authHeader.includes("Bearer ")) {
                const token = authHeader.split("Bearer ")[1]?.trim();
                if (token && token.startsWith("eyJ")) {
                  self2._saveCapturedToken(token);
                }
              }
            }
          } catch {
          }
          return originalFetch.apply(this, arguments);
        };
      }
    },
    _extractJwtFromValue(val, keyName = "") {
      if (!val || typeof val !== "string") return null;
      let clean = val.trim();
      if (clean.startsWith('"') && clean.endsWith('"') || clean.startsWith("'") && clean.endsWith("'")) {
        clean = clean.slice(1, -1);
      }
      if (clean.startsWith("eyJ") && clean.split(".").length === 3) {
        return clean;
      }
      if (clean.includes("Bearer eyJ")) {
        const m = clean.match(/Bearer\s+(eyJ[a-zA-Z0-9_\-\.]+)/);
        if (m) return m[1];
      }
      if (clean.startsWith("{") && clean.endsWith("}")) {
        try {
          const obj = JSON.parse(clean);
          const candidates = [obj.token, obj.access_token, obj.accessToken, obj.jwt, obj.access, obj.authToken];
          for (const c of candidates) {
            if (typeof c === "string" && c.startsWith("eyJ")) {
              return c;
            }
          }
        } catch {
        }
      }
      return null;
    },
    _saveCapturedToken(token) {
      if (!token || !this.isTokenValid(token)) return;
      this._cachedToken = token;
      if (typeof window !== "undefined") {
        window.lastAuthToken = token;
      }
      try {
        localStorage.setItem("mentari_auth_token", token);
      } catch {
      }
      Storage.set({ mentari_auth_token: token });
    }
  };
  if (typeof window !== "undefined") {
    UnpamAuth.installLiveSniffer();
  }

  // src/utils/toast.js
  var ToastManager = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.container = null;
      this._init();
    }
    _init() {
      if (typeof document === "undefined") return;
      this.host = document.createElement("div");
      this.host.id = "mentari-toast-host";
      this.host.style.position = "fixed";
      this.host.style.top = "20px";
      this.host.style.right = "20px";
      this.host.style.zIndex = "2147483647";
      this.host.style.pointerEvents = "none";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      .toast-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
      }
      .toast-card {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(18, 18, 20, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        color: #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .toast-card.hide {
        opacity: 0;
        transform: translateX(30px);
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }
      .toast-content {
        flex-grow: 1;
      }
      .toast-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 2px;
        color: #fff;
      }
      .toast-message {
        color: #b0b3b8;
        font-size: 12px;
        word-break: break-word;
      }
      .toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }
      .toast-close:hover {
        color: #fff;
      }
      /* Variants */
      .toast-info { border-left: 3px solid #3b82f6; }
      .toast-info .toast-icon { color: #3b82f6; }
      .toast-success { border-left: 3px solid #10b981; }
      .toast-success .toast-icon { color: #10b981; }
      .toast-warning { border-left: 3px solid #f59e0b; }
      .toast-warning .toast-icon { color: #f59e0b; }
      .toast-error { border-left: 3px solid #ef4444; }
      .toast-error .toast-icon { color: #ef4444; }
    `;
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.container);
      const mount = () => {
        if (document.body && !document.getElementById("mentari-toast-host")) {
          document.body.appendChild(this.host);
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
      } else {
        mount();
      }
    }
    _getIconSvg(type) {
      switch (type) {
        case "success":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        case "warning":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        case "error":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        default:
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
    }
    show(options) {
      if (!this.container) return;
      if (document.body && !this.host.parentElement) {
        document.body.appendChild(this.host);
      }
      const {
        title = "",
        message = "",
        type = "info",
        // 'info' | 'success' | 'warning' | 'error'
        duration = 4500
      } = typeof options === "string" ? { message: options } : options;
      const card = document.createElement("div");
      card.className = `toast-card toast-${type}`;
      card.innerHTML = `
      <div class="toast-icon">${this._getIconSvg(type)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ""}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Tutup">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
      const closeBtn = card.querySelector(".toast-close");
      const dismiss = () => {
        card.classList.add("hide");
        setTimeout(() => {
          if (card.parentElement) card.remove();
        }, 250);
      };
      closeBtn.addEventListener("click", dismiss);
      if (duration > 0) {
        setTimeout(dismiss, duration);
      }
      this.container.appendChild(card);
    }
    success(message, title = "Berhasil") {
      this.show({ title, message, type: "success" });
    }
    error(message, title = "Terjadi Kesalahan") {
      this.show({ title, message, type: "error", duration: 6e3 });
    }
    warning(message, title = "Perhatian") {
      this.show({ title, message, type: "warning" });
    }
    info(message, title = "Informasi") {
      this.show({ title, message, type: "info" });
    }
  };
  var Toast = new ToastManager();

  // src/utils/docx-generator.js
  var import_jszip = __toESM(require_jszip_min(), 1);
  function escapeXml(unsafe) {
    if (unsafe === null || unsafe === void 0) return "";
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }
  function htmlToParagraphs(html) {
    if (!html) return [];
    let text = html.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
    text = text.replace(/<li[^>]*>/gi, "\n\u2022 ");
    text = text.replace(/<\/li>/gi, "");
    text = text.replace(/<br\s*[\/]?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<\/tr>/gi, "\n");
    text = text.replace(/<\/td>/gi, " | ");
    text = text.replace(/<[^>]+>/g, "");
    const rawLines = text.split("\n");
    const paragraphs = [];
    let prevWasEmpty = false;
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        paragraphs.push(trimmed);
        prevWasEmpty = false;
      } else if (!prevWasEmpty && paragraphs.length > 0) {
        prevWasEmpty = true;
      }
    }
    return paragraphs;
  }
  function createParagraphXml({
    text = "",
    bold = false,
    italic = false,
    fontSize = 24,
    // 24 = 12pt (satuan half-point)
    align = "left",
    indentLeft = 0,
    // dxa (1cm = 567 dxa)
    spaceBefore = 60,
    spaceAfter = 60,
    lineSpacing = 360,
    // 360 = 1.5 line spacing
    runs = null
  }) {
    let pPr = `<w:pPr>`;
    if (align && align !== "left") {
      pPr += `<w:jc w:val="${align}"/>`;
    }
    if (indentLeft > 0) {
      pPr += `<w:ind w:left="${indentLeft}"/>`;
    }
    pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${lineSpacing}" w:lineRule="auto"/>`;
    pPr += `</w:pPr>`;
    let rXml = "";
    if (Array.isArray(runs) && runs.length > 0) {
      for (const run of runs) {
        rXml += `<w:r><w:rPr>`;
        rXml += `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
        if (run.bold) rXml += `<w:b/><w:bCs/>`;
        if (run.italic) rXml += `<w:i/><w:iCs/>`;
        const sz = run.fontSize || fontSize;
        rXml += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
        rXml += `<w:color w:val="000000"/>`;
        rXml += `</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
      }
    } else if (text !== void 0) {
      rXml = `<w:r><w:rPr>`;
      rXml += `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
      if (bold) rXml += `<w:b/><w:bCs/>`;
      if (italic) rXml += `<w:i/><w:iCs/>`;
      rXml += `<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`;
      rXml += `<w:color w:val="000000"/>`;
      rXml += `</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
    }
    return `<w:p>${pPr}${rXml}</w:p>`;
  }
  var DocxGenerator = class {
    /**
     * Bangun dokumen Word Rekap Tugas Forum Diskusi
     * @param {Object} data
     * @param {string} data.studentName
     * @param {string} data.studentNim
     * @param {string} data.dateString
     * @param {Array}  data.courses
     * @returns {Promise<Blob>}
     */
    static async generateForumRecap({ studentName, studentNim, dateString, courses }) {
      const zip = new import_jszip.default();
      zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`
      );
      zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );
      zip.file(
        "word/_rels/document.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`
      );
      zip.file(
        "word/settings.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`
      );
      zip.file(
        "word/fontTable.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fontTable xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fontTable>`
      );
      zip.file(
        "word/styles.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:color w:val="000000"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`
      );
      let bodyXml = "";
      bodyXml += createParagraphXml({
        text: "REKAP TUGAS FORUM DISKUSI",
        bold: true,
        fontSize: 30,
        // 15pt
        align: "center",
        spaceBefore: 0,
        spaceAfter: 40
      });
      bodyXml += createParagraphXml({
        text: "UNIVERSITAS PAMULANG",
        bold: true,
        fontSize: 26,
        // 13pt
        align: "center",
        spaceBefore: 0,
        spaceAfter: 160
      });
      bodyXml += `<w:p><w:pPr><w:pBdr><w:bottom w:val="double" w:sz="12" w:space="4" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="160"/></w:pPr></w:p>`;
      bodyXml += createParagraphXml({
        runs: [
          { text: "Nama Mahasiswa : ", bold: true },
          { text: studentName || "Mahasiswa UNPAM" }
        ],
        fontSize: 24,
        spaceBefore: 40,
        spaceAfter: 40
      });
      bodyXml += createParagraphXml({
        runs: [
          { text: "NIM            : ", bold: true },
          { text: studentNim || "-" }
        ],
        fontSize: 24,
        spaceBefore: 40,
        spaceAfter: 40
      });
      bodyXml += createParagraphXml({
        runs: [
          { text: "Tanggal Rekap  : ", bold: true },
          { text: dateString || (/* @__PURE__ */ new Date()).toLocaleDateString("id-ID") }
        ],
        fontSize: 24,
        spaceBefore: 40,
        spaceAfter: 40
      });
      bodyXml += createParagraphXml({
        runs: [
          { text: "Status Tugas   : ", bold: true },
          { text: "Belum Dikerjakan / Belum Dijawab" }
        ],
        fontSize: 24,
        spaceBefore: 40,
        spaceAfter: 240
      });
      let courseIndex = 1;
      for (const course of courses) {
        if (!course.meetings || course.meetings.length === 0) continue;
        const courseTitleDisplay = `${courseIndex}. ${course.courseTitle || course.courseCode || "Mata Kuliah"}`;
        bodyXml += createParagraphXml({
          text: courseTitleDisplay,
          bold: true,
          fontSize: 26,
          // 13pt
          spaceBefore: 240,
          spaceAfter: 120
        });
        for (const meeting of course.meetings) {
          const meetingTitle = `Pertemuan ${meeting.meetingNum !== null ? meeting.meetingNum : ""}${meeting.sectionName ? ` - ${meeting.sectionName}` : ""}`;
          bodyXml += createParagraphXml({
            text: meetingTitle,
            bold: true,
            fontSize: 24,
            // 12pt
            indentLeft: 400,
            // indent ~0.7cm
            spaceBefore: 140,
            spaceAfter: 80
          });
          if (meeting.topicTitle) {
            bodyXml += createParagraphXml({
              runs: [
                { text: "Topik: ", bold: true, italic: true },
                { text: meeting.topicTitle, italic: true }
              ],
              fontSize: 24,
              indentLeft: 720,
              spaceBefore: 40,
              spaceAfter: 60
            });
          }
          bodyXml += createParagraphXml({
            text: "Isi forum :",
            bold: true,
            fontSize: 24,
            indentLeft: 720,
            // indent ~1.27cm
            spaceBefore: 80,
            spaceAfter: 40
          });
          const questionParagraphs = meeting.paragraphs && meeting.paragraphs.length > 0 ? meeting.paragraphs : meeting.rawMessage ? htmlToParagraphs(meeting.rawMessage) : ["(Tidak ada teks soal/instruksi terlampir dari dosen)"];
          for (const pText of questionParagraphs) {
            bodyXml += createParagraphXml({
              text: pText,
              fontSize: 24,
              indentLeft: 720,
              spaceBefore: 40,
              spaceAfter: 60,
              lineSpacing: 360
              // 1.5 line spacing
            });
          }
          bodyXml += createParagraphXml({
            text: "Jawaban :",
            bold: true,
            fontSize: 24,
            indentLeft: 720,
            spaceBefore: 120,
            spaceAfter: 60
          });
          for (let i = 0; i < 3; i++) {
            bodyXml += createParagraphXml({
              text: "________________________________________________________________________________",
              fontSize: 24,
              indentLeft: 720,
              spaceBefore: 40,
              spaceAfter: 40
            });
          }
          bodyXml += createParagraphXml({
            text: "",
            fontSize: 24,
            spaceBefore: 100,
            spaceAfter: 100
          });
        }
        courseIndex++;
      }
      const sectPr = `<w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>`;
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    ${sectPr}
  </w:body>
</w:document>`;
      zip.file("word/document.xml", documentXml);
      return await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
    }
    /**
     * Unduh file blob di browser dengan nama file yang ditentukan
     */
    static downloadFile(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1200);
    }
    /**
     * Format hari dan tanggal bahasa Indonesia untuk nama file dan isi dokumen
     * Contoh: 'Senin, 21 September 2026'
     */
    static getIndonesianDayAndDate(date = /* @__PURE__ */ new Date()) {
      try {
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(date);
      } catch {
        return date.toLocaleDateString("id-ID");
      }
    }
    /**
     * Sanitasi string agar aman dijadikan nama file di Windows/Mac/Linux
     */
    static sanitizeFileName(name) {
      if (!name) return "Mahasiswa";
      return name.replace(/[\\/*?:"<>|]/g, "").replace(/\s+/g, " ").trim();
    }
  };

  // src/content/token.js
  var ALL_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Rekomendasi)" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (Cepat)" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash (Next-Gen)" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite (RPD 500)" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite (RPD 500)" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Power)" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Deep)" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (Reasoning)" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Flagship)" }
  ];
  var MentariDashboard = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.isOpen = false;
      this.courses = [];
      this.activeForums = [];
      this.evaluations = [];
      this.forumFilter = "all";
      this.forumSearchQuery = "";
      this.expandedForumCourses = /* @__PURE__ */ new Set();
      this._userModifiedForumAccordion = false;
      this.courseForumsMeta = {};
      this._lastSyncedAt = null;
      this._isRefreshingForums = false;
      this.evalFilter = "all";
      this.evalSearchQuery = "";
      this.evalTypeFilter = "all";
      this.expandedCourses = /* @__PURE__ */ new Set();
      this._userModifiedAccordion = false;
      this._currentFetchPromise = null;
      this._studentName = "";
      this._studentNim = "";
      this.currentTheme = "dark";
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] Dashboard & Token Engine aktif.");
      try {
        const { mentari_theme } = await Storage.get("mentari_theme", { mentari_theme: "dark" });
        if (mentari_theme === "light" || mentari_theme === "dark") {
          this.currentTheme = mentari_theme;
        }
      } catch {
      }
      UnpamAuth.installLiveSniffer();
      window.addEventListener("mentari-toggle-popup", () => {
        this.toggleModal();
      });
      window.addEventListener("mentari-token-captured", () => {
        this._prefetchData();
      });
    }
    async toggleModal() {
      if (this.isOpen) {
        this.closeModal();
      } else {
        await this.openModal();
      }
    }
    async openModal() {
      if (!this.host) {
        this._buildDashboardDOM();
      }
      this._applyTheme(this.currentTheme);
      const overlay = this.shadow.querySelector(".overlay");
      overlay.classList.add("open");
      this.isOpen = true;
      this.expandedCourses.clear();
      this._userModifiedAccordion = false;
      this.expandedForumCourses.clear();
      this._userModifiedForumAccordion = false;
      await this._renderFromCache();
      this._loadCoursesAndForums();
    }
    closeModal() {
      if (!this.shadow) return;
      const overlay = this.shadow.querySelector(".overlay");
      if (overlay) overlay.classList.remove("open");
      this.isOpen = false;
    }
    _buildDashboardDOM() {
      this.host = document.createElement("div");
      this.host.id = "mentari-dashboard-host";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.28);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.55);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
      }

      /* Modern Range Slider */
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 4px;
        outline: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #d4af37;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        transition: transform 0.15s ease, background-color 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: #f3cf55;
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(10px);
        z-index: 2147483642;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .modal {
        width: 760px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #141418;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 18px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e5e5e5;
        position: relative;
      }
      .header {
        padding: 16px 22px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        cursor: grab;
        user-select: none;
      }
      .header:active {
        cursor: grabbing;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .theme-toggle-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      .theme-toggle-btn:hover {
        color: #d4af37;
        background: rgba(255, 255, 255, 0.06);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        font-weight: 800;
        font-size: 15px;
      }
      .brand-badge {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 700;
      }
      .close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        display: flex;
        border-radius: 6px;
        transition: color 0.2s;
      }
      .close-btn:hover { color: #fff; }
      
      /* Tabs Bar */
      .tabs-bar {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.35);
        overflow-x: auto;
        flex-shrink: 0;
        gap: 4px;
      }
      .tab-btn {
        background: transparent;
        border: none;
        padding: 12px 16px;
        color: #999;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-bottom: 2px solid transparent;
      }
      .tab-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.03);
      }
      .tab-btn.active {
        color: #d4af37;
        border-bottom-color: #d4af37;
        background: rgba(212, 175, 55, 0.06);
      }
      .tab-content {
        flex-grow: 1;
        padding: 20px 22px;
        overflow-y: auto;
        display: none;
      }
      .tab-content.active { display: block; }

      /* Filter Pills */
      .filter-pills {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .filter-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #aaa;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
      }
      .filter-pill:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ddd;
      }
      .filter-pill.active {
        background: rgba(212, 175, 55, 0.2);
        border-color: rgba(212, 175, 55, 0.5);
        color: #d4af37;
      }
      .filter-pill .pill-count {
        background: rgba(255, 255, 255, 0.12);
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 10px;
        margin-left: 6px;
        font-weight: 700;
      }
      .filter-pill.active .pill-count {
        background: rgba(212, 175, 55, 0.35);
        color: #fff;
      }

      /* Forum Controls & Search */
      .forum-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
        align-items: center;
      }
      .forum-search-wrap {
        flex: 1;
        min-width: 220px;
        position: relative;
        display: flex;
        align-items: center;
      }
      .forum-search-icon {
        position: absolute;
        left: 12px;
        color: #888;
        pointer-events: none;
      }
      .forum-search-input {
        width: 100%;
        background: #19191f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 8px 32px 8px 34px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
      }
      .forum-search-input:focus {
        border-color: #d4af37;
      }
      .forum-search-clear {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        display: none;
        line-height: 1;
      }
      .forum-search-clear:hover { color: #fff; }
      .forum-filter-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .forum-toggle-all-btn {
        background: rgba(255, 255, 255, 0.06);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .forum-toggle-all-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .forum-export-docx-btn {
        background: rgba(37, 99, 235, 0.15);
        border-color: rgba(59, 130, 246, 0.35);
        color: #60a5fa;
      }
      .forum-export-docx-btn:hover {
        background: rgba(37, 99, 235, 0.28);
        border-color: rgba(59, 130, 246, 0.55);
        color: #93c5fd;
      }
      .forum-sync-time {
        font-size: 11px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 0 4px;
      }

      /* Forum Accordion Card & Items */
      .forum-course-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .forum-course-card:hover {
        border-color: rgba(212, 175, 55, 0.2);
      }
      .forum-accordion-header {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        user-select: none;
        background: rgba(255, 255, 255, 0.02);
        transition: background 0.15s;
      }
      .forum-accordion-header:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .forum-accordion-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        min-width: 0;
      }
      .forum-accordion-title span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .forum-accordion-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .forum-accordion-chevron {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        color: #888;
      }
      .forum-accordion-chevron.open {
        transform: rotate(180deg);
        color: #d4af37;
      }
      .forum-accordion-content {
        display: none;
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }
      .forum-accordion-content.open {
        display: block;
      }
      .forum-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        transition: all 0.2s;
      }
      .forum-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.2);
      }
      .forum-item-info {
        flex: 1;
        min-width: 0;
      }
      .forum-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #ddd;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .forum-item-meta {
        font-size: 10px;
        color: #777;
        margin-top: 2px;
      }
      .forum-btn-action {
        background: rgba(212, 175, 55, 0.15);
        color: #d4af37;
        border: 1px solid rgba(212, 175, 55, 0.35);
        padding: 5px 12px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        text-decoration: none;
      }
      .forum-btn-action:hover {
        background: #d4af37;
        color: #121212;
      }
      .forum-unavailable-box {
        background: rgba(245, 158, 11, 0.06);
        border: 1px dashed rgba(245, 158, 11, 0.25);
        border-radius: 9px;
        padding: 10px 14px;
        margin-top: 8px;
        margin-bottom: 6px;
      }
      .forum-unavailable-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #fbbf24;
      }
      .forum-unavailable-title {
        font-size: 12px;
        font-weight: 600;
        color: #fbbf24;
      }
      .forum-unavailable-reason {
        font-size: 11px;
        color: #aaa;
        margin-top: 4px;
        margin-left: 22px;
        line-height: 1.4;
      }

      /* Legacy Forum Card & Open Button Fallback */
      .forum-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        transition: all 0.2s;
      }
      .forum-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.3);
      }
      .forum-title {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
      }
      .forum-course {
        font-size: 11px;
        color: #999;
      }
      .btn-open-forum {
        background: #d4af37;
        color: #121212;
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
      }

      /* Status Badges */
      .badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        margin-left: 6px;
      }
      .badge-done {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
      }
      .badge-pending {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
      }
      .badge-locked {
        color: #6b7280;
        background: rgba(107, 114, 128, 0.15);
      }

      /* Evaluasi Tab & Accordion */
      .eval-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
        align-items: center;
      }
      .eval-search-wrap {
        flex: 1;
        min-width: 220px;
        position: relative;
        display: flex;
        align-items: center;
      }
      .eval-search-icon {
        position: absolute;
        left: 12px;
        color: #888;
        pointer-events: none;
      }
      .eval-search-input {
        width: 100%;
        background: #19191f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 8px 32px 8px 34px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
      }
      .eval-search-input:focus {
        border-color: #d4af37;
      }
      .eval-search-clear {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        display: none;
        line-height: 1;
      }
      .eval-search-clear:hover { color: #fff; }
      .eval-filter-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .eval-type-select {
        background: #19191f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      .eval-type-select:focus {
        border-color: #d4af37;
      }
      .eval-toggle-all-btn {
        background: rgba(255, 255, 255, 0.06);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .eval-toggle-all-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      @keyframes mentari-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spin-animation {
        animation: mentari-spin 1s linear infinite;
      }
      .eval-course-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .eval-course-card:hover {
        border-color: rgba(212, 175, 55, 0.2);
      }
      .eval-accordion-header {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        user-select: none;
        background: rgba(255, 255, 255, 0.02);
        transition: background 0.15s;
      }
      .eval-accordion-header:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .eval-accordion-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        min-width: 0;
      }
      .eval-accordion-title span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .eval-accordion-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .eval-accordion-chevron {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        color: #888;
      }
      .eval-accordion-chevron.open {
        transform: rotate(180deg);
        color: #d4af37;
      }
      .eval-accordion-content {
        display: none;
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }
      .eval-accordion-content.open {
        display: block;
      }
      .eval-section-label {
        font-size: 11px;
        font-weight: 700;
        color: #d4af37;
        padding: 6px 0 4px;
        margin-top: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .eval-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        transition: all 0.2s;
      }
      .eval-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.2);
      }
      .eval-item-info {
        flex: 1;
        min-width: 0;
      }
      .eval-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #ddd;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .eval-item-meta {
        font-size: 10px;
        color: #777;
        margin-top: 2px;
      }
      .eval-btn-action {
        background: rgba(212, 175, 55, 0.15);
        color: #d4af37;
        border: 1px solid rgba(212, 175, 55, 0.35);
        padding: 5px 12px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .eval-btn-action:hover {
        background: rgba(212, 175, 55, 0.3);
      }
      .eval-btn-done {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.3);
        cursor: default;
      }
      .eval-btn-locked {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
        border-color: rgba(107, 114, 128, 0.2);
        cursor: not-allowed;
      }
      .eval-type-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .eval-summary {
        background: rgba(212, 175, 55, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      .eval-stat {
        text-align: center;
      }
      .eval-stat-value {
        font-size: 20px;
        font-weight: 800;
        color: #d4af37;
      }
      .eval-stat-label {
        font-size: 10px;
        color: #999;
        margin-top: 2px;
      }

      /* Settings */
      .settings-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .settings-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        gap: 16px;
      }
      .settings-info h4 { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 2px; }
      .settings-info p { font-size: 11px; color: #888; }
      .select-field {
        background: #1e1e24;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      .select-field:focus { border-color: #d4af37; }
      .btn-config {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-config:hover { background: rgba(255, 255, 255, 0.15); }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: #888;
      }
      .empty-state-icon {
        margin-bottom: 12px;
        opacity: 0.4;
      }
      .loading-text {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 13px;
      }

      /* \u2500\u2500\u2500 Light Mode Overrides \u2500\u2500\u2500 */
      .modal.theme-light {
        background: #f8fafc;
        border-color: #cbd5e1;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
        color: #1e293b;
        scrollbar-color: rgba(217, 119, 6, 0.35) transparent;
      }
      .modal.theme-light ::-webkit-scrollbar-thumb {
        background: rgba(217, 119, 6, 0.35);
      }
      .modal.theme-light ::-webkit-scrollbar-thumb:hover {
        background: rgba(217, 119, 6, 0.65);
      }
      .modal.theme-light .header {
        background: #ffffff;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .brand {
        color: #0f172a;
      }
      .modal.theme-light .brand-badge {
        background: rgba(217, 119, 6, 0.15);
        color: #b45309;
      }
      .modal.theme-light .close-btn,
      .modal.theme-light .theme-toggle-btn {
        color: #64748b;
      }
      .modal.theme-light .close-btn:hover,
      .modal.theme-light .theme-toggle-btn:hover {
        color: #0f172a;
        background: rgba(0, 0, 0, 0.05);
      }
      .modal.theme-light .tabs-bar {
        background: #f1f5f9;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .tab-btn {
        color: #64748b;
      }
      .modal.theme-light .tab-btn:hover {
        color: #0f172a;
        background: rgba(0, 0, 0, 0.04);
      }
      .modal.theme-light .tab-btn.active {
        color: #b45309;
        border-bottom-color: #d97706;
        background: rgba(217, 119, 6, 0.08);
      }
      .modal.theme-light .filter-pill {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #64748b;
      }
      .modal.theme-light .filter-pill:hover {
        background: #e2e8f0;
        color: #1e293b;
      }
      .modal.theme-light .filter-pill.active {
        background: rgba(217, 119, 6, 0.15);
        border-color: rgba(217, 119, 6, 0.6);
        color: #b45309;
      }
      .modal.theme-light .filter-pill .pill-count {
        background: rgba(0, 0, 0, 0.08);
      }
      .modal.theme-light .filter-pill.active .pill-count {
        background: rgba(217, 119, 6, 0.25);
        color: #78350f;
      }
      .modal.theme-light .forum-search-input,
      .modal.theme-light .eval-search-input,
      .modal.theme-light .eval-type-select,
      .modal.theme-light .select-field {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .modal.theme-light .forum-search-input:focus,
      .modal.theme-light .eval-search-input:focus,
      .modal.theme-light .eval-type-select:focus,
      .modal.theme-light .select-field:focus {
        border-color: #d97706;
      }
      .modal.theme-light .forum-search-icon,
      .modal.theme-light .eval-search-icon {
        color: #94a3b8;
      }
      .modal.theme-light .forum-toggle-all-btn,
      .modal.theme-light .eval-toggle-all-btn,
      .modal.theme-light .btn-config {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #334155;
      }
      .modal.theme-light .forum-toggle-all-btn:hover,
      .modal.theme-light .eval-toggle-all-btn:hover,
      .modal.theme-light .btn-config:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .modal.theme-light .forum-export-docx-btn {
        background: rgba(37, 99, 235, 0.1);
        border-color: rgba(59, 130, 246, 0.35);
        color: #1d4ed8;
      }
      .modal.theme-light .forum-export-docx-btn:hover {
        background: rgba(37, 99, 235, 0.18);
        border-color: rgba(59, 130, 246, 0.5);
        color: #1e40af;
      }
      .modal.theme-light .forum-sync-time {
        color: #64748b;
      }
      .modal.theme-light .forum-course-card,
      .modal.theme-light .eval-course-card {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .modal.theme-light .forum-accordion-header,
      .modal.theme-light .eval-accordion-header {
        background: #f8fafc;
      }
      .modal.theme-light .forum-accordion-header:hover,
      .modal.theme-light .eval-accordion-header:hover {
        background: #f1f5f9;
      }
      .modal.theme-light .forum-accordion-title,
      .modal.theme-light .eval-accordion-title {
        color: #0f172a;
      }
      .modal.theme-light .forum-accordion-meta,
      .modal.theme-light .eval-accordion-meta {
        color: #64748b;
      }
      .modal.theme-light .forum-accordion-content,
      .modal.theme-light .eval-accordion-content {
        border-top-color: #f1f5f9;
      }
      .modal.theme-light .forum-item,
      .modal.theme-light .eval-item {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .forum-item:hover,
      .modal.theme-light .eval-item:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .modal.theme-light .forum-item-title,
      .modal.theme-light .eval-item-title {
        color: #0f172a;
      }
      .modal.theme-light .forum-item-meta,
      .modal.theme-light .eval-item-meta {
        color: #64748b;
      }
      .modal.theme-light .forum-unavailable-box {
        background: rgba(0, 0, 0, 0.02);
        border-color: #cbd5e1;
      }
      .modal.theme-light .forum-unavailable-title {
        color: #475569;
      }
      .modal.theme-light .forum-unavailable-reason {
        color: #64748b;
      }
      .modal.theme-light .eval-summary {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .eval-stat-value {
        color: #0f172a;
      }
      .modal.theme-light .eval-stat-label {
        color: #64748b;
      }
      .modal.theme-light .settings-group {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .settings-item {
        background: #f8fafc;
        border-bottom-color: #f1f5f9;
      }
      .modal.theme-light .settings-info h4 {
        color: #0f172a;
      }
      .modal.theme-light .settings-info p {
        color: #64748b;
      }
      .modal.theme-light .empty-state,
      .modal.theme-light .loading-text {
        color: #64748b;
      }
    `;
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      overlay.innerHTML = `
      <div class="modal">
        <div class="header" id="dashboard-modal-header">
          <div class="brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff7b00">
              <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
            Mentari Mod
            <span class="brand-badge">Modern Edition</span>
          </div>
          <div class="header-actions">
            <button class="theme-toggle-btn" id="btn-theme-toggle" title="Ganti Tema (Gelap / Terang)">
            </button>
            <button class="close-btn" id="btn-close" title="Tutup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="tabs-bar">
          <button class="tab-btn active" data-tab="tab-forums">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Forum Aktif
          </button>
          <button class="tab-btn" data-tab="tab-evaluations">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Kuis & Evaluasi
          </button>
          <button class="tab-btn" data-tab="tab-courses">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Mata Kuliah
          </button>
          <button class="tab-btn" data-tab="tab-settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Pengaturan
          </button>
        </div>

        <div class="tab-content active" id="tab-forums">
          <div id="forum-filter-bar"></div>
          <div id="forum-controls-bar"></div>
          <div id="forum-list-container">
            <div class="loading-text">Memuat forum aktif...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-evaluations">
          <div id="eval-filter-bar"></div>
          <div id="eval-summary-bar"></div>
          <div id="eval-controls-bar"></div>
          <div id="eval-list-container">
            <div class="loading-text">Memuat data kuis & evaluasi...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-courses">
          <div id="course-list-container">
            <div class="loading-text">Memuat daftar mata kuliah...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-settings">
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-info">
                <h4>Pilihan Model Gemini AI Aktif</h4>
                <p>Ubah model yang digunakan untuk menjawab kuis dan forum kapan saja.</p>
              </div>
              <select id="select-active-model" class="select-field">
                ${ALL_MODELS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}
              </select>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Konfigurasi Gemini API Key</h4>
                <p>Atur atau perbarui Google Gemini API Key (format AQ. atau AIza...).</p>
              </div>
              <button class="btn-config" id="btn-open-api-settings">Ubah API Key</button>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Sinkronisasi Ulang Akun</h4>
                <p>Pindai ulang token login dari sesi aktif Mentari UNPAM.</p>
              </div>
              <button class="btn-config" id="btn-refresh-token">Refresh Token</button>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Tema Tampilan Dashboard</h4>
                <p>Pilih mode tampilan antarmuka Gelap (Obsidian) atau Terang (Clean Light).</p>
              </div>
              <select id="select-dashboard-theme" class="select-field">
                <option value="dark">Mode Gelap (Emas & Obsidian)</option>
                <option value="light">Mode Terang (Clean Light)</option>
              </select>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Otomatisasi Selesai Kuis</h4>
                <p>Otomatis mengonfirmasi submit selesai kuis setelah semua soal terjawab.</p>
              </div>
              <input type="checkbox" id="toggle-auto-finish" style="cursor:pointer; width:18px; height:18px;">
            </div>
          </div>
        </div>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(overlay);
      document.body.appendChild(this.host);
      const close = () => this.closeModal();
      this.shadow.getElementById("btn-close").addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
        const link = e.target.closest("a[href]");
        if (link) {
          const href = link.getAttribute("href");
          if (href && !href.startsWith("#") && !link.hasAttribute("download")) {
            e.preventDefault();
            close();
            window.location.href = href;
          }
        }
      });
      const tabBtns = this.shadow.querySelectorAll(".tab-btn");
      const tabContents = this.shadow.querySelectorAll(".tab-content");
      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          tabBtns.forEach((b) => b.classList.remove("active"));
          tabContents.forEach((c) => c.classList.remove("active"));
          btn.classList.add("active");
          const targetId = btn.getAttribute("data-tab");
          this.shadow.getElementById(targetId)?.classList.add("active");
        });
      });
      const selectModel = this.shadow.getElementById("select-active-model");
      const validModelIds = ALL_MODELS.map((m) => m.id);
      Storage.get("gemini_model").then(({ gemini_model }) => {
        if (gemini_model && validModelIds.includes(gemini_model)) {
          selectModel.value = gemini_model;
        } else {
          selectModel.value = "gemini-2.5-flash";
          Storage.set({ gemini_model: "gemini-2.5-flash" });
        }
      });
      selectModel.addEventListener("change", () => {
        const chosen = selectModel.value;
        if (chosen && validModelIds.includes(chosen)) {
          Storage.set({ gemini_model: chosen });
          Toast.success(`Model Gemini diubah ke: ${selectModel.options[selectModel.selectedIndex].text}`);
        }
      });
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.gemini_model) {
            const newModel = changes.gemini_model.newValue;
            if (newModel && validModelIds.includes(newModel) && selectModel.value !== newModel) {
              selectModel.value = newModel;
            }
          }
        });
      }
      this.shadow.getElementById("btn-open-api-settings").addEventListener("click", () => {
        this.closeModal();
        window.dispatchEvent(new CustomEvent("mentari-update-api-key"));
      });
      this.shadow.getElementById("btn-refresh-token").addEventListener("click", async () => {
        UnpamAuth._cachedToken = null;
        const token = await UnpamAuth.getAuthToken();
        if (token) {
          Toast.success("Token berhasil dipindai ulang!");
          await this._loadCoursesAndForums();
        } else {
          Toast.warning("Pastikan kamu sudah login ke mentari.unpam.ac.id.");
        }
      });
      const toggleAutoFinish = this.shadow.getElementById("toggle-auto-finish");
      Storage.get("mentari_auto_finish_quiz").then(({ mentari_auto_finish_quiz }) => {
        toggleAutoFinish.checked = !!mentari_auto_finish_quiz;
      });
      toggleAutoFinish.addEventListener("change", () => {
        Storage.set({ mentari_auto_finish_quiz: toggleAutoFinish.checked });
        Toast.info(`Auto finish kuis: ${toggleAutoFinish.checked ? "Aktif" : "Nonaktif"}`);
      });
      const btnThemeToggle = this.shadow.getElementById("btn-theme-toggle");
      if (btnThemeToggle) {
        btnThemeToggle.addEventListener("click", () => {
          this.toggleTheme();
        });
      }
      const selectTheme = this.shadow.getElementById("select-dashboard-theme");
      if (selectTheme) {
        selectTheme.value = this.currentTheme;
        selectTheme.addEventListener("change", () => {
          this.setTheme(selectTheme.value);
        });
      }
      this._applyTheme(this.currentTheme);
      const modalEl = this.shadow.querySelector(".modal");
      const headerEl = this.shadow.getElementById("dashboard-modal-header");
      if (modalEl && headerEl) {
        this._makeElementDraggable(modalEl, headerEl);
      }
    }
    _applyTheme(theme) {
      this.currentTheme = theme === "light" ? "light" : "dark";
      if (!this.shadow) return;
      const modalEl = this.shadow.querySelector(".modal");
      if (modalEl) {
        if (this.currentTheme === "light") {
          modalEl.classList.add("theme-light");
        } else {
          modalEl.classList.remove("theme-light");
        }
      }
      const selectTheme = this.shadow.getElementById("select-dashboard-theme");
      if (selectTheme && selectTheme.value !== this.currentTheme) {
        selectTheme.value = this.currentTheme;
      }
      const btnToggle = this.shadow.getElementById("btn-theme-toggle");
      if (btnToggle) {
        if (this.currentTheme === "dark") {
          btnToggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Ganti ke Mode Terang"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        } else {
          btnToggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Ganti ke Mode Gelap"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        }
      }
    }
    async toggleTheme() {
      const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
      await this.setTheme(nextTheme);
    }
    async setTheme(theme) {
      this.currentTheme = theme === "light" ? "light" : "dark";
      await Storage.set({ mentari_theme: this.currentTheme });
      this._applyTheme(this.currentTheme);
      Toast.info(`Tema diubah ke: ${this.currentTheme === "light" ? "Mode Terang" : "Mode Gelap"}`);
    }
    _makeElementDraggable(element, handle) {
      if (!element || !handle) return;
      handle.style.cursor = "grab";
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;
      const onPointerDown = (e) => {
        if (e.target.closest("button, input, select, a, textarea")) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        element.style.position = "fixed";
        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.margin = "0";
        element.style.transform = "none";
        handle.style.cursor = "grabbing";
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
        }
      };
      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        const maxLeft = Math.max(10, window.innerWidth - element.offsetWidth - 10);
        const maxTop = Math.max(10, window.innerHeight - element.offsetHeight - 10);
        newLeft = Math.max(10, Math.min(newLeft, maxLeft));
        newTop = Math.max(10, Math.min(newTop, maxTop));
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
      };
      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        handle.style.cursor = "grab";
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch {
        }
      };
      handle.addEventListener("pointerdown", onPointerDown);
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    }
    // ─── Cache ────────────────────────────────────────────────────────────────────
    async _renderFromCache() {
      try {
        const token = await UnpamAuth.getAuthToken();
        const userId = UnpamAuth.getUserIdentifier(token);
        const cacheKey = `mentari_cached_data_${userId}`;
        const stored = await Storage.get([cacheKey, "mentari_cached_courses", "mentari_cached_forums"]);
        const userCache = stored[cacheKey];
        const cachedCourses = userCache?.courses || stored.mentari_cached_courses || [];
        const cachedForums = userCache?.forums || stored.mentari_cached_forums || [];
        const cachedEvals = userCache?.evaluations || [];
        this.courseForumsMeta = userCache?.courseForumsMeta || {};
        this._lastSyncedAt = userCache?.lastSyncedAt || userCache?.updatedAt || null;
        if (cachedCourses.length > 0) {
          this.courses = cachedCourses;
          this._renderCourses(cachedCourses);
        }
        if (cachedForums.length > 0 || Object.keys(this.courseForumsMeta).length > 0 || cachedCourses.length > 0) {
          this.activeForums = cachedForums;
          this._renderForums(cachedForums, cachedCourses);
        }
        if (cachedEvals.length > 0) {
          this.evaluations = cachedEvals;
          this._renderEvaluations(cachedEvals);
        }
      } catch (e) {
        console.log("[Mentari Mod] Info cache status:", e.message);
      }
    }
    // ─── Render: Courses ──────────────────────────────────────────────────────────
    _renderCourses(list) {
      const courseContainer = this.shadow?.getElementById("course-list-container");
      if (!courseContainer || !list) return;
      if (list.length === 0) {
        courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif.</div>';
        return;
      }
      courseContainer.innerHTML = "";
      list.forEach((c) => {
        const courseCode = c.kode_course || c.kode || c.course_code || c.id;
        const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
        const sks = c.sks || "-";
        const item = document.createElement("div");
        item.className = "forum-card";
        item.innerHTML = `
        <div>
          <div class="forum-title">${courseTitle}</div>
          <div class="forum-course">Kode: ${courseCode} | SKS: ${sks}</div>
        </div>
        <a class="btn-open-forum" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}">Buka Kelas</a>
      `;
        courseContainer.appendChild(item);
      });
    }
    // ─── Render: Forums with Filter ───────────────────────────────────────────────
    /**
     * Cek apakah item forum sudah diselesaikan:
     * Prioritas 1: sub.completion (Flag resmi LMS database Mentari)
     * Prioritas 2: f.answered (Deteksi balasan reply mahasiswa >= 2 di forum)
     */
    _isForumDone(f) {
      return Boolean(f.completion === true || f.answered === true);
    }
    _computeUnavailableRanges(meetingNums) {
      if (!meetingNums || meetingNums.length === 0) return [];
      const sorted = Array.from(new Set(meetingNums)).sort((a, b) => a - b);
      const ranges = [];
      let rangeStart = sorted[0];
      let rangeEnd = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        if (current === rangeEnd + 1) {
          rangeEnd = current;
        } else {
          ranges.push({
            start: rangeStart,
            end: rangeEnd,
            text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`,
            reason: "Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka"
          });
          rangeStart = current;
          rangeEnd = current;
        }
      }
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`,
        reason: "Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka"
      });
      return ranges;
    }
    _formatLastSyncTime() {
      if (!this._lastSyncedAt) {
        return `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>Belum sinkron</span>
      `;
      }
      const diffSec = Math.floor((Date.now() - this._lastSyncedAt) / 1e3);
      let timeLabel = "";
      if (diffSec < 45) {
        timeLabel = "Baru saja";
      } else if (diffSec < 3600) {
        const min = Math.floor(diffSec / 60);
        timeLabel = `${min} menit lalu`;
      } else {
        const d = new Date(this._lastSyncedAt);
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        timeLabel = `Pukul ${hours}:${mins}`;
      }
      return `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Sinkron: ${timeLabel}</span>
    `;
    }
    _renderForumFilterPills(forums) {
      const filterBar = this.shadow?.getElementById("forum-filter-bar");
      if (!filterBar) return;
      const total = forums.length;
      const doneCount = forums.filter((f) => this._isForumDone(f)).length;
      const pendingCount = total - doneCount;
      filterBar.innerHTML = "";
      const pills = document.createElement("div");
      pills.className = "filter-pills";
      pills.innerHTML = `
      <button class="filter-pill ${this.forumFilter === "all" ? "active" : ""}" data-filter="all">
        Semua<span class="pill-count">${total}</span>
      </button>
      <button class="filter-pill ${this.forumFilter === "pending" ? "active" : ""}" data-filter="pending">
        Belum Dijawab<span class="pill-count">${pendingCount}</span>
      </button>
      <button class="filter-pill ${this.forumFilter === "done" ? "active" : ""}" data-filter="done">
        Sudah Dijawab<span class="pill-count">${doneCount}</span>
      </button>
    `;
      pills.querySelectorAll(".filter-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          this.forumFilter = pill.dataset.filter;
          this._renderForums(this.activeForums, this.courses);
        });
      });
      filterBar.appendChild(pills);
    }
    _renderForumControls() {
      const controlsBar = this.shadow?.getElementById("forum-controls-bar");
      if (!controlsBar) return;
      let controlsWrap = controlsBar.querySelector(".forum-controls");
      if (!controlsWrap) {
        controlsBar.innerHTML = `
        <div class="forum-controls">
          <div class="forum-search-wrap">
            <svg class="forum-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="forum-search-input" id="forum-search-input" placeholder="Cari forum diskusi, mata kuliah, pertemuan..." value="${this.forumSearchQuery}">
            <button class="forum-search-clear" id="forum-search-clear" title="Hapus pencarian">&times;</button>
          </div>
          <div class="forum-filter-actions">
            <button class="forum-toggle-all-btn" id="forum-toggle-all-btn" title="Buka / Tutup Semua Accordion">
              <svg id="forum-toggle-all-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
              </svg>
              <span id="forum-toggle-all-text">Buka Semua</span>
            </button>
            <button class="forum-toggle-all-btn forum-export-docx-btn" id="forum-export-docx-btn" title="Unduh Rekap Soal Forum yang Belum Dikerjakan (.docx)">
              <svg id="forum-export-docx-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span id="forum-export-docx-text">Rekap Tugas (.docx)</span>
            </button>
            <button class="forum-toggle-all-btn" id="forum-refresh-status-btn" title="Periksa dan Sinkronkan Status Forum Diskusi dari Server UNPAM">
              <svg id="forum-refresh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span id="forum-refresh-status-text">Periksa Status</span>
            </button>
            <div class="forum-sync-time" id="forum-sync-time" title="Waktu sinkronisasi status terakhir dengan server UNPAM">
              ${this._formatLastSyncTime()}
            </div>
          </div>
        </div>
      `;
        const searchInput = controlsBar.querySelector("#forum-search-input");
        const clearBtn = controlsBar.querySelector("#forum-search-clear");
        const toggleAllBtn = controlsBar.querySelector("#forum-toggle-all-btn");
        const refreshStatusBtn = controlsBar.querySelector("#forum-refresh-status-btn");
        const refreshIcon = controlsBar.querySelector("#forum-refresh-status-icon");
        const refreshText = controlsBar.querySelector("#forum-refresh-status-text");
        const exportDocxBtn = controlsBar.querySelector("#forum-export-docx-btn");
        const exportDocxIcon = controlsBar.querySelector("#forum-export-docx-icon");
        const exportDocxText = controlsBar.querySelector("#forum-export-docx-text");
        if (this.forumSearchQuery) {
          clearBtn.style.display = "block";
        }
        searchInput.addEventListener("input", (e) => {
          this.forumSearchQuery = e.target.value.trim().toLowerCase();
          clearBtn.style.display = this.forumSearchQuery ? "block" : "none";
          this._renderForums(this.activeForums, this.courses);
        });
        clearBtn.addEventListener("click", () => {
          searchInput.value = "";
          this.forumSearchQuery = "";
          this.expandedForumCourses.clear();
          clearBtn.style.display = "none";
          searchInput.focus();
          this._renderForums(this.activeForums, this.courses);
        });
        toggleAllBtn.addEventListener("click", () => {
          this._handleToggleAllForumCourses();
        });
        if (exportDocxBtn) {
          exportDocxBtn.addEventListener("click", async () => {
            await this._handleExportForumRecap(exportDocxBtn, exportDocxIcon, exportDocxText);
          });
        }
        if (refreshStatusBtn) {
          refreshStatusBtn.addEventListener("click", async () => {
            if (this._isRefreshingForums) return;
            this._isRefreshingForums = true;
            refreshStatusBtn.disabled = true;
            if (refreshIcon) refreshIcon.classList.add("spin-animation");
            if (refreshText) refreshText.textContent = "Memeriksa...";
            Toast.info("Memeriksa status forum diskusi terbaru langsung dari server UNPAM...");
            try {
              this._currentFetchPromise = null;
              await this._loadCoursesAndForums();
              Toast.success("Status forum diskusi berhasil disinkronkan dengan server UNPAM!");
            } catch (err) {
              console.error("[Mentari] Gagal sinkronisasi status forum:", err);
              Toast.error("Gagal memperbarui status forum dari server. Silakan coba lagi.");
            } finally {
              this._isRefreshingForums = false;
              refreshStatusBtn.disabled = false;
              if (refreshIcon) refreshIcon.classList.remove("spin-animation");
              if (refreshText) refreshText.textContent = "Periksa Status";
            }
          });
        }
      } else {
        const timeEl = controlsBar.querySelector("#forum-sync-time");
        if (timeEl) {
          timeEl.innerHTML = this._formatLastSyncTime();
        }
      }
      this._updateForumToggleAllBtn();
    }
    _handleToggleAllForumCourses() {
      if (!this._visibleForumCourseCodes || this._visibleForumCourseCodes.length === 0) return;
      const allExpanded = this._visibleForumCourseCodes.every((code) => this.expandedForumCourses.has(code));
      if (allExpanded) {
        this._visibleForumCourseCodes.forEach((code) => this.expandedForumCourses.delete(code));
      } else {
        this._visibleForumCourseCodes.forEach((code) => this.expandedForumCourses.add(code));
      }
      this._userModifiedForumAccordion = true;
      this._renderForums(this.activeForums, this.courses);
    }
    _updateForumToggleAllBtn() {
      const toggleBtn = this.shadow?.getElementById("forum-toggle-all-btn");
      const toggleText = this.shadow?.getElementById("forum-toggle-all-text");
      const toggleIcon = this.shadow?.getElementById("forum-toggle-all-icon");
      if (!toggleBtn || !toggleText || !this._visibleForumCourseCodes) return;
      const hasCourses = this._visibleForumCourseCodes.length > 0;
      const allExpanded = hasCourses && this._visibleForumCourseCodes.every((code) => this.expandedForumCourses.has(code));
      toggleText.textContent = allExpanded ? "Tutup Semua" : "Buka Semua";
      if (toggleIcon) {
        toggleIcon.innerHTML = allExpanded ? '<path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>' : '<path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>';
      }
    }
    async _handleExportForumRecap(btn, icon, textEl) {
      if (this._isExportingDocx) return;
      this._isExportingDocx = true;
      const originalText = textEl ? textEl.textContent : "Rekap Tugas (.docx)";
      if (btn) btn.disabled = true;
      if (textEl) textEl.textContent = "Menyiapkan...";
      if (icon) icon.classList.add("spin-animation");
      try {
        let pendingForums = (this.activeForums || []).filter((f) => !f.completion && !f.answered);
        if (!pendingForums || pendingForums.length === 0) {
          Toast.info("Luar biasa! Tidak ada tugas forum diskusi yang pending (semua sudah selesai).");
          return;
        }
        Toast.info(`Menyiapkan rekap untuk ${pendingForums.length} tugas forum diskusi...`);
        await this._resolveStudentIdentity();
        const token = await UnpamAuth.getToken();
        const xsrf = await UnpamAuth.getXSRFToken();
        const headers = { "Accept": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
        const fetchOpts = { headers, credentials: "omit" };
        const missingTopicForums = pendingForums.filter((f) => !f.topics || f.topics.length === 0);
        if (missingTopicForums.length > 0 && token) {
          if (textEl) textEl.textContent = "Mengambil Soal...";
          await Promise.allSettled(missingTopicForums.map(async (f) => {
            try {
              const res = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${f.forumId}`, fetchOpts);
              if (res.ok) {
                const topicData = await res.json();
                const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
                f.topics = topics.map((t) => ({
                  id: t.id,
                  title: t.judul || t.title || t.name || "",
                  message: t.deskripsi || t.pesan || t.message || t.content || t.body || ""
                }));
              }
            } catch {
            }
          }));
        }
        if (textEl) textEl.textContent = "Menyusun Docx...";
        const courseMap = /* @__PURE__ */ new Map();
        for (const forum of pendingForums) {
          const cKey = forum.courseCode || forum.courseTitle || "UNKNOWN";
          if (!courseMap.has(cKey)) {
            courseMap.set(cKey, {
              courseCode: forum.courseCode,
              courseTitle: forum.courseTitle,
              meetings: []
            });
          }
          const cData = courseMap.get(cKey);
          const topics = forum.topics && forum.topics.length > 0 ? forum.topics : [{ title: "", message: "" }];
          for (const top of topics) {
            cData.meetings.push({
              meetingNum: forum.meetingNum,
              sectionName: forum.sectionName,
              forumName: forum.forumName,
              topicTitle: top.title,
              rawMessage: top.message
            });
          }
        }
        const coursesPayload = Array.from(courseMap.values()).map((c) => {
          c.meetings.sort((a, b) => {
            const mA = a.meetingNum !== null ? a.meetingNum : 999;
            const mB = b.meetingNum !== null ? b.meetingNum : 999;
            return mA - mB;
          });
          return c;
        });
        const dateString = DocxGenerator.getIndonesianDayAndDate(/* @__PURE__ */ new Date());
        const safeName = DocxGenerator.sanitizeFileName(this._studentName || "Mahasiswa");
        const safeNim = DocxGenerator.sanitizeFileName(this._studentNim || "NIM");
        const fileName = `Rekap Tugas_${dateString}_${safeName}_${safeNim}.docx`;
        const docxBlob = await DocxGenerator.generateForumRecap({
          studentName: this._studentName,
          studentNim: this._studentNim,
          dateString,
          courses: coursesPayload
        });
        DocxGenerator.downloadFile(docxBlob, fileName);
        Toast.success(`Dokumen berhasil dibuat dan diunduh: ${fileName}`);
      } catch (err) {
        console.error("[Mentari] Gagal mengekspor rekap forum ke DOCX:", err);
        Toast.error("Gagal membuat dokumen Word rekap tugas: " + (err.message || "Terjadi kesalahan"));
      } finally {
        this._isExportingDocx = false;
        if (btn) btn.disabled = false;
        if (textEl) textEl.textContent = originalText;
        if (icon) icon.classList.remove("spin-animation");
      }
    }
    _renderForums(forumItems, coursesFallback = []) {
      const forumContainer = this.shadow?.getElementById("forum-list-container");
      if (!forumContainer) return;
      this._renderForumFilterPills(forumItems || []);
      this._renderForumControls();
      forumContainer.innerHTML = "";
      const allCourses = this.courses && this.courses.length > 0 ? this.courses : coursesFallback;
      if ((!allCourses || allCourses.length === 0) && (!forumItems || forumItems.length === 0)) {
        forumContainer.innerHTML = '<div class="empty-state">Tidak ada data forum atau mata kuliah aktif saat ini.</div>';
        this._visibleForumCourseCodes = [];
        this._updateForumToggleAllBtn();
        return;
      }
      const courseMap = /* @__PURE__ */ new Map();
      if (allCourses && allCourses.length > 0) {
        allCourses.forEach((c) => {
          const code = c.kode_course || c.kode || c.course_code || c.id;
          const title = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
          if (code && !courseMap.has(code)) {
            courseMap.set(code, { courseCode: code, courseTitle: title, items: [] });
          }
        });
      }
      if (forumItems && forumItems.length > 0) {
        forumItems.forEach((f) => {
          if (!courseMap.has(f.courseCode)) {
            courseMap.set(f.courseCode, {
              courseCode: f.courseCode,
              courseTitle: f.courseTitle || "Mata Kuliah",
              items: []
            });
          }
          courseMap.get(f.courseCode).items.push(f);
        });
      }
      for (const [code, cData] of courseMap.entries()) {
        cData.items.sort((a, b) => {
          const aNum = a.meetingNum || 0;
          const bNum = b.meetingNum || 0;
          if (aNum !== bNum) return aNum - bNum;
          return (a.sectionName || "").localeCompare(b.sectionName || "");
        });
      }
      const visibleCourseCodes = [];
      const q = (this.forumSearchQuery || "").toLowerCase();
      for (const [code, cData] of courseMap.entries()) {
        const allCourseItems = cData.items;
        const meta = this.courseForumsMeta[code] || {};
        const unavailableRanges = meta.unavailableRanges || [];
        let filteredCourseItems = allCourseItems;
        if (this.forumFilter === "pending") {
          filteredCourseItems = allCourseItems.filter((f) => !this._isForumDone(f));
          if (filteredCourseItems.length === 0) continue;
        } else if (this.forumFilter === "done") {
          filteredCourseItems = allCourseItems.filter((f) => this._isForumDone(f));
          if (filteredCourseItems.length === 0) continue;
        }
        if (q) {
          const titleMatches = cData.courseTitle.toLowerCase().includes(q) || code.toLowerCase().includes(q);
          const matchingItems = filteredCourseItems.filter((f) => {
            const fn = (f.forumName || "").toLowerCase();
            const sn = (f.sectionName || "").toLowerCase();
            return fn.includes(q) || sn.includes(q);
          });
          const matchingRanges = unavailableRanges.filter((r) => r.text.toLowerCase().includes(q));
          if (!titleMatches && matchingItems.length === 0 && matchingRanges.length === 0) {
            continue;
          }
          if (!titleMatches && matchingItems.length > 0) {
            filteredCourseItems = matchingItems;
          }
        }
        visibleCourseCodes.push(code);
      }
      this._visibleForumCourseCodes = visibleCourseCodes;
      if (visibleCourseCodes.length === 0) {
        this._updateForumToggleAllBtn();
        if (this.forumSearchQuery || this.forumFilter !== "all") {
          forumContainer.innerHTML = `
          <div class="empty-state">
            <p>Tidak ada forum yang cocok dengan pencarian atau filter yang dipilih.</p>
            <button class="btn-config" id="btn-reset-forum-filters" style="margin-top:12px;">Reset Filter & Pencarian</button>
          </div>
        `;
          forumContainer.querySelector("#btn-reset-forum-filters")?.addEventListener("click", () => {
            this.forumSearchQuery = "";
            this.forumFilter = "all";
            this.expandedForumCourses.clear();
            const input = this.shadow?.getElementById("forum-search-input");
            if (input) input.value = "";
            const clear = this.shadow?.getElementById("forum-search-clear");
            if (clear) clear.style.display = "none";
            this._renderForums(this.activeForums, this.courses);
          });
        } else {
          forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
        }
        return;
      }
      if (this.forumSearchQuery) {
        visibleCourseCodes.forEach((c) => this.expandedForumCourses.add(c));
      }
      for (const code of visibleCourseCodes) {
        const cData = courseMap.get(code);
        const allCourseItems = cData.items;
        const meta = this.courseForumsMeta[code] || {};
        const unavailableRanges = meta.unavailableRanges || [];
        let displayItems = allCourseItems;
        if (this.forumFilter === "pending") {
          displayItems = allCourseItems.filter((f) => !this._isForumDone(f));
        } else if (this.forumFilter === "done") {
          displayItems = allCourseItems.filter((f) => this._isForumDone(f));
        }
        if (q) {
          const titleMatches = cData.courseTitle.toLowerCase().includes(q) || code.toLowerCase().includes(q);
          if (!titleMatches) {
            displayItems = displayItems.filter((f) => {
              const fn = (f.forumName || "").toLowerCase();
              const sn = (f.sectionName || "").toLowerCase();
              return fn.includes(q) || sn.includes(q);
            });
          }
        }
        const pendingInCourse = allCourseItems.filter((f) => !this._isForumDone(f)).length;
        const isExpanded = this.expandedForumCourses.has(code);
        const card = document.createElement("div");
        card.className = "forum-course-card";
        card.dataset.course = code;
        const header = document.createElement("div");
        header.className = "forum-accordion-header";
        header.dataset.course = code;
        header.innerHTML = `
        <div class="forum-accordion-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span title="${cData.courseTitle}">${cData.courseTitle}</span>
        </div>
        <div class="forum-accordion-meta">
          ${allCourseItems.length === 0 ? `<span class="badge" style="background:rgba(245,158,11,0.12); color:#fbbf24;">0 Forum Aktif</span>` : pendingInCourse > 0 ? `<span class="badge badge-pending">${pendingInCourse} Belum</span>` : `<span class="badge badge-done">Selesai Semua</span>`}
          <span class="badge" style="background:rgba(255,255,255,0.06); color:#aaa;">${allCourseItems.length} Forum</span>
          <svg class="forum-accordion-chevron ${isExpanded ? "open" : ""}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;
        const content = document.createElement("div");
        content.className = `forum-accordion-content ${isExpanded ? "open" : ""}`;
        displayItems.forEach((f) => {
          const isDone = this._isForumDone(f);
          const itemDiv = document.createElement("div");
          itemDiv.className = "forum-item";
          itemDiv.innerHTML = `
          <div class="forum-item-info">
            <div class="forum-item-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isDone ? "#10b981" : "#f59e0b"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>${f.sectionName} &bull; ${f.forumName}</span>
              ${isDone ? '<span class="badge badge-done">Sudah Dijawab</span>' : '<span class="badge badge-pending">Belum Dijawab</span>'}
            </div>
            <div class="forum-item-meta">${f.courseTitle} &bull; ${f.sectionName}</div>
          </div>
          <a class="forum-btn-action" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(f.courseCode)}/forum/${f.forumId}">Buka Forum</a>
        `;
          content.appendChild(itemDiv);
        });
        if (this.forumFilter === "all" && unavailableRanges.length > 0) {
          unavailableRanges.forEach((range) => {
            const unDiv = document.createElement("div");
            unDiv.className = "forum-unavailable-box";
            unDiv.innerHTML = `
            <div class="forum-unavailable-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="forum-unavailable-title">${range.text} Belum Tersedia</span>
            </div>
            <div class="forum-unavailable-reason">
              Alasan: ${range.reason}
            </div>
          `;
            content.appendChild(unDiv);
          });
        } else if (displayItems.length === 0 && unavailableRanges.length === 0) {
          content.innerHTML = `<div style="font-size:12px; color:#888; padding:8px 4px;">Tidak ada forum untuk mata kuliah ini.</div>`;
        }
        header.addEventListener("click", () => {
          this._userModifiedForumAccordion = true;
          const isCurrentlyOpen = content.classList.contains("open");
          forumContainer.querySelectorAll(".forum-course-card").forEach((otherCard) => {
            otherCard.querySelector(".forum-accordion-content")?.classList.remove("open");
            otherCard.querySelector(".forum-accordion-chevron")?.classList.remove("open");
          });
          this.expandedForumCourses.clear();
          if (!isCurrentlyOpen) {
            content.classList.add("open");
            header.querySelector(".forum-accordion-chevron")?.classList.add("open");
            this.expandedForumCourses.add(code);
          }
          this._updateForumToggleAllBtn();
        });
        card.appendChild(header);
        card.appendChild(content);
        forumContainer.appendChild(card);
      }
      this._updateForumToggleAllBtn();
    }
    // ─── Render: Evaluations ──────────────────────────────────────────────────────
    _renderEvalFilterPills(evals) {
      const filterBar = this.shadow?.getElementById("eval-filter-bar");
      if (!filterBar) return;
      const total = evals.length;
      const pendingCount = evals.filter((e) => !e.completion && !e.locked).length;
      const doneCount = evals.filter((e) => e.completion).length;
      filterBar.innerHTML = "";
      const pills = document.createElement("div");
      pills.className = "filter-pills";
      pills.innerHTML = `
      <button class="filter-pill ${this.evalFilter === "all" ? "active" : ""}" data-filter="all">
        Semua<span class="pill-count">${total}</span>
      </button>
      <button class="filter-pill ${this.evalFilter === "pending" ? "active" : ""}" data-filter="pending">
        Belum Dikerjakan<span class="pill-count">${pendingCount}</span>
      </button>
      <button class="filter-pill ${this.evalFilter === "done" ? "active" : ""}" data-filter="done">
        Sudah Selesai<span class="pill-count">${doneCount}</span>
      </button>
    `;
      pills.querySelectorAll(".filter-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          this.evalFilter = pill.dataset.filter;
          this._renderEvaluations(this.evaluations, false);
        });
      });
      filterBar.appendChild(pills);
    }
    _renderEvalSummary(evals) {
      const summaryBar = this.shadow?.getElementById("eval-summary-bar");
      if (!summaryBar) return;
      const preTests = evals.filter((e) => e.type === "PRE_TEST");
      const postTests = evals.filter((e) => e.type === "POST_TEST");
      const kuesioners = evals.filter((e) => e.type === "KUESIONER");
      const preDone = preTests.filter((e) => e.completion).length;
      const postDone = postTests.filter((e) => e.completion).length;
      const kuesDone = kuesioners.filter((e) => e.completion).length;
      summaryBar.innerHTML = `
      <div class="eval-summary">
        <div class="eval-stat">
          <div class="eval-stat-value">${preDone}/${preTests.length}</div>
          <div class="eval-stat-label">Pre-Test</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${postDone}/${postTests.length}</div>
          <div class="eval-stat-label">Post-Test</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${kuesDone}/${kuesioners.length}</div>
          <div class="eval-stat-label">Kuesioner</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${preDone + postDone + kuesDone}/${evals.length}</div>
          <div class="eval-stat-label">Total</div>
        </div>
      </div>
    `;
    }
    _renderEvalControls(evals) {
      const controlsBar = this.shadow?.getElementById("eval-controls-bar");
      if (!controlsBar) return;
      let controlsWrap = controlsBar.querySelector(".eval-controls");
      if (!controlsWrap) {
        controlsBar.innerHTML = `
        <div class="eval-controls">
          <div class="eval-search-wrap">
            <svg class="eval-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="eval-search-input" id="eval-search-input" placeholder="Cari kuis, evaluasi, mata kuliah, pertemuan..." value="${this.evalSearchQuery}">
            <button class="eval-search-clear" id="eval-search-clear" title="Hapus pencarian">&times;</button>
          </div>
          <div class="eval-filter-actions">
            <select class="eval-type-select" id="eval-type-select">
              <option value="all">Semua Tipe</option>
              <option value="PRE_TEST">Pre-Test</option>
              <option value="POST_TEST">Post-Test</option>
              <option value="KUESIONER">Kuesioner</option>
            </select>
            <button class="eval-toggle-all-btn" id="eval-toggle-all-btn" title="Buka / Tutup Semua Accordion">
              <svg id="eval-toggle-all-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
              </svg>
              <span id="eval-toggle-all-text">Buka Semua</span>
            </button>
            <button class="eval-toggle-all-btn" id="eval-refresh-status-btn" title="Periksa dan Sinkronkan Status dari Server UNPAM (Deteksi Kuis Berjalan / Belum Selesai)">
              <svg id="eval-refresh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span id="eval-refresh-status-text">Periksa Status</span>
            </button>
            <button class="eval-toggle-all-btn" id="eval-autopilot-btn" title="Auto-Pilot Kuis Batch (1 Tab Murni)" style="background:rgba(212,175,55,0.18); border-color:rgba(212,175,55,0.45); color:#fbbf24; font-weight:700;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Auto-Pilot Kuis</span>
            </button>
          </div>
        </div>
      `;
        const searchInput = controlsBar.querySelector("#eval-search-input");
        const clearBtn = controlsBar.querySelector("#eval-search-clear");
        const typeSelect = controlsBar.querySelector("#eval-type-select");
        const toggleAllBtn = controlsBar.querySelector("#eval-toggle-all-btn");
        const refreshStatusBtn = controlsBar.querySelector("#eval-refresh-status-btn");
        const refreshIcon = controlsBar.querySelector("#eval-refresh-status-icon");
        const refreshText = controlsBar.querySelector("#eval-refresh-status-text");
        const autoPilotBtn = controlsBar.querySelector("#eval-autopilot-btn");
        if (this.evalSearchQuery) {
          clearBtn.style.display = "block";
        }
        searchInput.addEventListener("input", (e) => {
          this.evalSearchQuery = e.target.value.trim().toLowerCase();
          clearBtn.style.display = this.evalSearchQuery ? "block" : "none";
          this._renderEvaluations(this.evaluations, false);
        });
        clearBtn.addEventListener("click", () => {
          searchInput.value = "";
          this.evalSearchQuery = "";
          this.expandedCourses.clear();
          clearBtn.style.display = "none";
          searchInput.focus();
          this._renderEvaluations(this.evaluations, false);
        });
        typeSelect.value = this.evalTypeFilter;
        typeSelect.addEventListener("change", (e) => {
          this.evalTypeFilter = e.target.value;
          this._renderEvaluations(this.evaluations, false);
        });
        toggleAllBtn.addEventListener("click", () => {
          this._handleToggleAllCourses();
        });
        if (refreshStatusBtn) {
          refreshStatusBtn.addEventListener("click", async () => {
            if (this._isRefreshingStatus) return;
            this._isRefreshingStatus = true;
            refreshStatusBtn.disabled = true;
            if (refreshIcon) refreshIcon.classList.add("spin-animation");
            if (refreshText) refreshText.textContent = "Memeriksa...";
            Toast.info("Memeriksa status kuis terbaru langsung dari server UNPAM...");
            try {
              this._currentFetchPromise = null;
              await this._loadCoursesAndForums();
              Toast.success("Status kuis & evaluasi berhasil disinkronkan dengan server UNPAM!");
            } catch (err) {
              console.error("[Mentari] Gagal sinkronisasi status:", err);
              Toast.error("Gagal memperbarui status dari server. Silakan coba lagi.");
            } finally {
              this._isRefreshingStatus = false;
              refreshStatusBtn.disabled = false;
              if (refreshIcon) refreshIcon.classList.remove("spin-animation");
              if (refreshText) refreshText.textContent = "Periksa Status";
            }
          });
        }
        if (autoPilotBtn) {
          autoPilotBtn.addEventListener("click", () => {
            this._openAutoPilotModal();
          });
        }
      }
      this._updateToggleAllBtn();
    }
    _handleToggleAllCourses() {
      if (!this._visibleCourseCodes || this._visibleCourseCodes.length === 0) return;
      const allExpanded = this._visibleCourseCodes.every((code) => this.expandedCourses.has(code));
      if (allExpanded) {
        this._visibleCourseCodes.forEach((code) => this.expandedCourses.delete(code));
      } else {
        this._visibleCourseCodes.forEach((code) => this.expandedCourses.add(code));
      }
      this._userModifiedAccordion = true;
      this._renderEvaluations(this.evaluations, false);
    }
    _updateToggleAllBtn() {
      const toggleBtn = this.shadow?.getElementById("eval-toggle-all-btn");
      const toggleText = this.shadow?.getElementById("eval-toggle-all-text");
      const toggleIcon = this.shadow?.getElementById("eval-toggle-all-icon");
      if (!toggleBtn || !toggleText || !this._visibleCourseCodes) return;
      const hasCourses = this._visibleCourseCodes.length > 0;
      const allExpanded = hasCourses && this._visibleCourseCodes.every((code) => this.expandedCourses.has(code));
      toggleText.textContent = allExpanded ? "Tutup Semua" : "Buka Semua";
      if (toggleIcon) {
        toggleIcon.innerHTML = allExpanded ? '<path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>' : '<path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>';
      }
    }
    async _openAutoPilotModal() {
      if (!this.evaluations || this.evaluations.length === 0) {
        Toast.warning("Belum ada data kuis & evaluasi. Silakan refresh tab terlebih dahulu.");
        return;
      }
      const validModelIds = ALL_MODELS.map((m) => m.id);
      const { gemini_model } = await Storage.get("gemini_model", { gemini_model: "gemini-2.5-flash" });
      const currentModel = gemini_model && validModelIds.includes(gemini_model) ? gemini_model : "gemini-2.5-flash";
      const existing = this.shadow.getElementById("mentari-autopilot-modal-overlay");
      if (existing) existing.remove();
      const storeComp = await Storage.get("mentari_completed_quiz_ids");
      const completedQuizIds = Array.isArray(storeComp?.mentari_completed_quiz_ids) ? storeComp.mentari_completed_quiz_ids : [];
      const pendingEvals = this.evaluations.filter((e) => !e.completion && !e.locked && (e.type === "PRE_TEST" || e.type === "POST_TEST" || e.type === "KUESIONER"));
      const coursesWithPending = [];
      const courseMap = {};
      pendingEvals.forEach((e) => {
        if (!courseMap[e.courseCode]) {
          courseMap[e.courseCode] = {
            code: e.courseCode,
            title: e.courseTitle,
            count: 0
          };
          coursesWithPending.push(courseMap[e.courseCode]);
        }
        courseMap[e.courseCode].count++;
      });
      let selectedMode = "all";
      const overlay = document.createElement("div");
      overlay.id = "mentari-autopilot-modal-overlay";
      overlay.className = "ap-overlay";
      overlay.innerHTML = `
      <style>
        .ap-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(14px);
          z-index: 2147483645;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: apFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes apFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .ap-modal *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .ap-modal *::-webkit-scrollbar-track {
          background: transparent;
        }
        .ap-modal *::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.28);
          border-radius: 4px;
        }
        .ap-modal *::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.55);
        }
        .ap-modal *::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .ap-modal * {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
        }
        .ap-modal {
          width: 650px;
          max-width: 94vw;
          max-height: 90vh;
          background: #131317;
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #f1f1f1;
          position: relative;
        }
        .ap-header {
          padding: 18px 24px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: grab;
          user-select: none;
        }
        .ap-header:active {
          cursor: grabbing;
        }
        .ap-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: 0.3px;
        }
        .ap-header-title svg {
          color: #d4af37;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.5));
        }
        .ap-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #999;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ap-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .ap-content {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ap-banner {
          background: rgba(212, 175, 55, 0.07);
          border: 1px solid rgba(212, 175, 55, 0.28);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ap-banner-icon {
          color: #fbbf24;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ap-banner-text {
          font-size: 12px;
          line-height: 1.55;
          color: #d1d5db;
        }
        .ap-banner-text b {
          color: #fbbf24;
        }
        .ap-field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ap-select {
          width: 100%;
          background: #1b1b20;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #f3f4f6;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .ap-select:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
        }
        .ap-select option {
          background: #18181c;
          color: #fff;
          padding: 8px;
        }
        .ap-mode-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
          gap: 8px;
        }
        .ap-mode-card {
          background: #18181d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          padding: 10px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
          transition: all 0.2s;
          user-select: none;
        }
        .ap-mode-card:hover {
          border-color: rgba(212, 175, 55, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }
        .ap-mode-card.active {
          background: rgba(212, 175, 55, 0.1);
          border-color: #fbbf24;
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.15);
        }
        .ap-mode-title {
          font-size: 12px;
          font-weight: 700;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .ap-mode-card.active .ap-mode-title {
          color: #fbbf24;
        }
        .ap-mode-sub {
          font-size: 10px;
          color: #888;
          line-height: 1.3;
        }
        .ap-cooldown-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-slider-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ap-slider {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .ap-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fbbf24;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 2px rgba(251, 191, 36, 0.9);
          transition: transform 0.15s ease;
        }
        .ap-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .ap-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fbbf24;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 2px rgba(251, 191, 36, 0.9);
          transition: transform 0.15s ease;
        }
        .ap-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        .ap-cooldown-badge {
          font-size: 12px;
          font-weight: 700;
          color: #111;
          background: #fbbf24;
          padding: 3px 9px;
          border-radius: 6px;
          white-space: nowrap;
          font-family: monospace;
        }
        .ap-presets {
          display: flex;
          gap: 6px;
        }
        .ap-preset-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #aaa;
          font-size: 11px;
          padding: 4px 9px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ap-preset-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .ap-preset-btn.active {
          background: rgba(212, 175, 55, 0.18);
          border-color: rgba(212, 175, 55, 0.45);
          color: #fbbf24;
        }
        .ap-queue-card {
          background: #17171c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ap-queue-header {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ap-queue-count-badge {
          font-size: 11px;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .ap-queue-list {
          max-height: 190px;
          overflow-y: auto;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ap-queue-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }
        .ap-queue-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .ap-row-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .ap-row-num {
          font-family: monospace;
          font-size: 11px;
          color: #777;
          width: 18px;
          flex-shrink: 0;
        }
        .ap-type-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .ap-type-tag.pre {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }
        .ap-type-tag.post {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .ap-type-tag.kues {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.25);
        }
        .ap-row-title {
          font-size: 12px;
          color: #e5e7eb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 330px;
        }
        .ap-row-status {
          font-size: 10px;
          color: #10b981;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .ap-skipped-box {
          margin-top: 6px;
          padding: 10px 12px;
          background: rgba(239, 68, 68, 0.07);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 8px;
          font-size: 11px;
          color: #fca5a5;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ap-skipped-header {
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f87171;
        }
        .ap-skipped-list {
          max-height: 80px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-left: 16px;
        }
        .ap-footer {
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }
        .ap-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #bbb;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ap-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .ap-btn-start {
          background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%);
          color: #111;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
        }
        .ap-btn-start:hover {
          background: linear-gradient(135deg, #e6be40 0%, #fbbf24 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }
        .ap-btn-start:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* \u2500\u2500\u2500 Auto-Pilot Modal Light Theme Overrides \u2500\u2500\u2500 */
        .ap-modal.theme-light {
          background: #ffffff;
          color: #1e293b;
          border-color: #cbd5e1;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb {
          background: rgba(217, 119, 6, 0.35);
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 119, 6, 0.65);
        }
        .ap-modal.theme-light * {
          scrollbar-color: rgba(217, 119, 6, 0.35) transparent;
        }
        .ap-modal.theme-light .ap-header {
          background: #f8fafc;
          border-bottom-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-header-title {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-close-btn {
          color: #64748b;
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .ap-modal.theme-light .ap-close-btn:hover {
          color: #0f172a;
          background: #e2e8f0;
        }
        .ap-modal.theme-light .ap-banner {
          background: rgba(217, 119, 6, 0.08);
          border-color: rgba(217, 119, 6, 0.3);
        }
        .ap-modal.theme-light .ap-banner-text {
          color: #334155;
        }
        .ap-modal.theme-light .ap-banner-text b {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-label {
          color: #475569;
        }
        .ap-modal.theme-light .ap-select {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-select option {
          background: #ffffff;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-mode-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-mode-card:hover {
          border-color: rgba(217, 119, 6, 0.4);
          background: #ffffff;
        }
        .ap-modal.theme-light .ap-mode-card.active {
          background: rgba(217, 119, 6, 0.08);
          border-color: #d97706;
          box-shadow: 0 0 14px rgba(217, 119, 6, 0.15);
        }
        .ap-modal.theme-light .ap-mode-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-mode-card.active .ap-mode-title {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-mode-sub {
          color: #64748b;
        }
        .ap-modal.theme-light .ap-slider {
          background: rgba(0, 0, 0, 0.12);
        }
        .ap-modal.theme-light .ap-slider::-webkit-slider-thumb {
          background: #d97706;
          box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
        }
        .ap-modal.theme-light .ap-slider::-moz-range-thumb {
          background: #d97706;
          box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
        }
        .ap-modal.theme-light .ap-cooldown-badge {
          background: #d97706;
          color: #ffffff;
        }
        .ap-modal.theme-light .ap-preset-btn {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;
        }
        .ap-modal.theme-light .ap-preset-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-preset-btn.active {
          background: rgba(217, 119, 6, 0.15);
          border-color: rgba(217, 119, 6, 0.45);
          color: #b45309;
        }
        .ap-modal.theme-light .ap-queue-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-queue-header {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-queue-row {
          background: #ffffff;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-row-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-footer {
          background: #f8fafc;
          border-top-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-btn-cancel {
          border-color: #cbd5e1;
          color: #475569;
        }
        .ap-modal.theme-light .ap-btn-cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
      </style>

      <div class="ap-modal">
        <div class="ap-header">
          <div class="ap-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Auto-Pilot Kuis Batch (Single-Tab)
          </div>
          <button class="ap-close-btn" id="btn-close-ap-modal" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="ap-content">
          <div class="ap-banner">
            <svg class="ap-banner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <div class="ap-banner-text">
              Otomatisasi kuis & evaluasi berurutan di <b>1 tab browser aktif</b> (hemat RAM & anti-freeze). Sesuai aturan akademik, <b>Post-Test otomatis dilewati jika Forum Diskusi & Pre-Test pertemuan terkait belum selesai</b>.
            </div>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Lingkup Mata Kuliah</label>
            <select id="ap-course-select" class="ap-select">
              <option value="all">Semua Mata Kuliah (${pendingEvals.length} Belum Selesai)</option>
              ${coursesWithPending.map((c) => `<option value="${c.code}">${c.title} (${c.count} Item)</option>`).join("")}
            </select>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Pilih Mode Pengerjaan</label>
            <div class="ap-mode-grid" id="ap-mode-container">
              <div class="ap-mode-card active" data-mode="all">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Semua Lengkap
                </div>
                <div class="ap-mode-sub">Pre, Post, Kuesioner</div>
              </div>
              <div class="ap-mode-card" data-mode="both">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Kuis Saja
                </div>
                <div class="ap-mode-sub">Pre-Test lalu Post-Test</div>
              </div>
              <div class="ap-mode-card" data-mode="pre">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Pre-Test
                </div>
                <div class="ap-mode-sub">Hanya Pre-Test</div>
              </div>
              <div class="ap-mode-card" data-mode="post">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Post-Test
                </div>
                <div class="ap-mode-sub">Wajib Forum & Pre tuntas</div>
              </div>
              <div class="ap-mode-card" data-mode="kuesioner">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Kuesioner
                </div>
                <div class="ap-mode-sub">Hanya Kuesioner Dosen</div>
              </div>
            </div>
          </div>

          <div class="ap-field-group">
            <div class="ap-label">
              <span>Model AI Gemini</span>
              <span style="color:#d4af37; font-size:10px; font-weight:600; text-transform:none;">Otak Penjawab Kuis</span>
            </div>
            <select id="ap-model-select" class="ap-select">
              ${ALL_MODELS.map((m) => `<option value="${m.id}" ${m.id === currentModel ? "selected" : ""}>${m.name}</option>`).join("")}
            </select>
          </div>

          <div class="ap-field-group ap-cooldown-wrap">
            <div class="ap-label">
              <span>Inter-Quiz Cooldown (Jeda Istirahat)</span>
              <span id="ap-cooldown-display" class="ap-cooldown-badge">15 detik</span>
            </div>
            <div class="ap-slider-row">
              <input type="range" id="ap-cooldown-slider" class="ap-slider" min="10" max="60" value="15" step="5">
              <div class="ap-presets">
                <button class="ap-preset-btn" data-val="10">10s</button>
                <button class="ap-preset-btn active" data-val="15">15s</button>
                <button class="ap-preset-btn" data-val="25">25s</button>
                <button class="ap-preset-btn" data-val="40">40s</button>
              </div>
            </div>
            <div style="font-size: 11px; color: #888;">
              Jeda istirahat acak di akhir kuis untuk mensimulasikan tempo manusia dan menghindari deteksi bot.
            </div>
          </div>

          <div class="ap-field-group">
            <div class="ap-queue-card">
              <div class="ap-queue-header">
                <span class="ap-label" style="color:#ddd; margin:0;">Pratinjau Antrean Eksekusi</span>
                <span id="ap-queue-count" class="ap-queue-count-badge">0 Kuis Terjadwal</span>
              </div>
              <div id="ap-queue-preview-list" class="ap-queue-list">
              </div>
            </div>
            <div id="ap-skipped-box" class="ap-skipped-box" style="display: none;">
            </div>
          </div>
        </div>

        <div class="ap-footer">
          <button class="ap-btn-cancel" id="btn-cancel-ap">Batal</button>
          <button class="ap-btn-start" id="btn-start-ap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Mulai Auto-Pilot (1 Tab)
          </button>
        </div>
      </div>
    `;
      this.shadow.appendChild(overlay);
      const apModal = overlay.querySelector(".ap-modal");
      const apHeader = overlay.querySelector(".ap-header");
      if (this.currentTheme === "light") {
        apModal?.classList.add("theme-light");
      }
      if (apModal && apHeader) {
        this._makeElementDraggable(apModal, apHeader);
      }
      const close = () => overlay.remove();
      overlay.querySelector("#btn-close-ap-modal").addEventListener("click", close);
      overlay.querySelector("#btn-cancel-ap").addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      const courseSelect = overlay.querySelector("#ap-course-select");
      const modeCards = overlay.querySelectorAll(".ap-mode-card");
      const cooldownSlider = overlay.querySelector("#ap-cooldown-slider");
      const cooldownDisplay = overlay.querySelector("#ap-cooldown-display");
      const presetBtns = overlay.querySelectorAll(".ap-preset-btn");
      const queueList = overlay.querySelector("#ap-queue-preview-list");
      const queueCount = overlay.querySelector("#ap-queue-count");
      const skippedBox = overlay.querySelector("#ap-skipped-box");
      const btnStart = overlay.querySelector("#btn-start-ap");
      const updateCooldown = (val) => {
        cooldownSlider.value = val;
        cooldownDisplay.textContent = `${val} detik`;
        presetBtns.forEach((b) => {
          if (parseInt(b.dataset.val, 10) === parseInt(val, 10)) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });
      };
      cooldownSlider.addEventListener("input", (e) => {
        updateCooldown(e.target.value);
      });
      presetBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          updateCooldown(btn.dataset.val);
        });
      });
      const parseMeetingNum = (secName) => {
        if (!secName) return 999;
        const m = secName.match(/pertemuan\s*(\d+)/i) || secName.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 999;
      };
      const calculateQueue = () => {
        const selectedCourse = courseSelect.value;
        let allCourseEvals = this.evaluations.filter((e) => !e.locked);
        if (selectedCourse !== "all") {
          allCourseEvals = allCourseEvals.filter((e) => e.courseCode === selectedCourse);
        }
        const courseGroups = {};
        allCourseEvals.forEach((e) => {
          if (!courseGroups[e.courseCode]) {
            courseGroups[e.courseCode] = {
              courseCode: e.courseCode,
              courseTitle: e.courseTitle,
              items: []
            };
          }
          courseGroups[e.courseCode].items.push(e);
        });
        const validQueue = [];
        const skippedList = [];
        for (const cCode in courseGroups) {
          const cGroup = courseGroups[cCode];
          const meetingMap = {};
          cGroup.items.forEach((item) => {
            const sec = item.sectionName || "Umum";
            if (!meetingMap[sec]) meetingMap[sec] = [];
            meetingMap[sec].push(item);
          });
          const sortedMeetings = Object.keys(meetingMap).sort((a, b) => {
            return parseMeetingNum(a) - parseMeetingNum(b);
          });
          for (const meetingName of sortedMeetings) {
            const mItems = meetingMap[meetingName];
            const preItem = mItems.find((i) => i.type === "PRE_TEST");
            const postItem = mItems.find((i) => i.type === "POST_TEST");
            const kuesItem = mItems.find((i) => i.type === "KUESIONER");
            let preScheduledInQueue = false;
            if (preItem && !preItem.completion) {
              if (selectedMode === "all" || selectedMode === "both" || selectedMode === "pre") {
                validQueue.push({
                  id: preItem.subId,
                  courseCode: preItem.courseCode,
                  courseTitle: preItem.courseTitle,
                  sectionName: preItem.sectionName,
                  type: "PRE_TEST",
                  name: preItem.name,
                  url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(preItem.courseCode)}/exam/${preItem.subId}`,
                  status: "pending"
                });
                preScheduledInQueue = true;
              }
            }
            if (postItem && !postItem.completion) {
              if (selectedMode === "all" || selectedMode === "both" || selectedMode === "post") {
                const matchingForum = (this.activeForums || []).find(
                  (f) => f.courseCode === postItem.courseCode && (f.sectionName === postItem.sectionName || f.sectionName && postItem.sectionName && f.sectionName.toLowerCase().trim() === postItem.sectionName.toLowerCase().trim())
                );
                const isForumDone = matchingForum && (matchingForum.completion === true || matchingForum.answered === true);
                const isPreDone = preItem && preItem.completion || preScheduledInQueue || !preItem;
                if (!isForumDone) {
                  const reason = matchingForum ? "Forum Diskusi belum dijawab/diselesaikan" : "Forum Diskusi belum ada/dibuat dosen";
                  skippedList.push({ item: postItem, reason });
                } else if (!isPreDone) {
                  skippedList.push({ item: postItem, reason: "Pre-Test pertemuan ini belum diselesaikan" });
                } else {
                  validQueue.push({
                    id: postItem.subId,
                    courseCode: postItem.courseCode,
                    courseTitle: postItem.courseTitle,
                    sectionName: postItem.sectionName,
                    type: "POST_TEST",
                    name: postItem.name,
                    url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(postItem.courseCode)}/exam/${postItem.subId}`,
                    status: "pending"
                  });
                }
              }
            }
            if (kuesItem && !kuesItem.completion) {
              if (selectedMode === "all" || selectedMode === "kuesioner") {
                validQueue.push({
                  id: kuesItem.subId,
                  courseCode: kuesItem.courseCode,
                  courseTitle: kuesItem.courseTitle,
                  sectionName: kuesItem.sectionName,
                  type: "KUESIONER",
                  name: kuesItem.name,
                  url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(kuesItem.courseCode)}/kuesioner/${kuesItem.subId}`,
                  status: "pending"
                });
              }
            }
          }
        }
        queueCount.textContent = `${validQueue.length} Item Terjadwal`;
        if (validQueue.length === 0) {
          queueList.innerHTML = `<div style="color:#777; text-align:center; padding:16px; font-size:12px;">Tidak ada kuis/evaluasi yang memenuhi syarat untuk dijalankan pada mode ini.</div>`;
          btnStart.disabled = true;
        } else {
          btnStart.disabled = false;
          queueList.innerHTML = validQueue.map((q, idx) => {
            let typeClass = "pre";
            let typeLabel = "Pre-Test";
            let statusLabel = "Siap";
            if (q.type === "POST_TEST") {
              typeClass = "post";
              typeLabel = "Post-Test";
              statusLabel = "Syarat Terpenuhi";
            } else if (q.type === "KUESIONER") {
              typeClass = "kues";
              typeLabel = "Kuesioner";
              statusLabel = "Siap Diisi";
            }
            return `
          <div class="ap-queue-row">
            <div class="ap-row-left">
              <span class="ap-row-num">${idx + 1}.</span>
              <span class="ap-type-tag ${typeClass}">
                ${typeLabel}
              </span>
              <span class="ap-row-title" title="${q.courseTitle} - ${q.sectionName}">
                <b>${q.sectionName}:</b> ${q.courseTitle}
              </span>
            </div>
            <span class="ap-row-status">${statusLabel}</span>
          </div>
          `;
          }).join("");
        }
        if (skippedList.length > 0) {
          skippedBox.style.display = "flex";
          skippedBox.innerHTML = `
          <div class="ap-skipped-header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ${skippedList.length} Post-Test dilewati (Prasyarat Forum Diskusi / Pre-Test belum terpenuhi):
          </div>
          <div class="ap-skipped-list">
            ${skippedList.map((s) => `
              <div>\u2022 <b>${s.item.sectionName}</b> (${s.item.courseTitle}): <span style="opacity:0.85;">${s.reason}</span></div>
            `).join("")}
          </div>
        `;
        } else {
          skippedBox.style.display = "none";
        }
        return validQueue;
      };
      let activeValidQueue = calculateQueue();
      courseSelect.addEventListener("change", () => {
        activeValidQueue = calculateQueue();
      });
      modeCards.forEach((card) => {
        card.addEventListener("click", () => {
          modeCards.forEach((c) => c.classList.remove("active"));
          card.classList.add("active");
          selectedMode = card.dataset.mode;
          activeValidQueue = calculateQueue();
        });
      });
      const modelSelect = overlay.querySelector("#ap-model-select");
      if (modelSelect) {
        modelSelect.addEventListener("change", () => {
          const chosen = modelSelect.value;
          if (chosen && validModelIds.includes(chosen)) {
            Storage.set({ gemini_model: chosen });
          }
        });
      }
      btnStart.addEventListener("click", async () => {
        if (!activeValidQueue || activeValidQueue.length === 0) {
          Toast.warning("Tidak ada antrean kuis yang valid.");
          return;
        }
        const cooldown = parseInt(cooldownSlider.value, 10) || 15;
        const chosenModel = modelSelect && modelSelect.value && validModelIds.includes(modelSelect.value) ? modelSelect.value : currentModel;
        await Storage.set({ gemini_model: chosenModel });
        await Storage.set({
          mentari_auto_pilot_state: {
            active: true,
            currentIndex: 0,
            cooldownSec: cooldown,
            queue: activeValidQueue,
            startedAt: Date.now(),
            paused: false,
            total: activeValidQueue.length,
            model: chosenModel
          }
        });
        const chosenModelObj = ALL_MODELS.find((m) => m.id === chosenModel);
        const chosenModelName = chosenModelObj ? chosenModelObj.name.split(" (")[0] : chosenModel;
        Toast.success(`Auto-Pilot Kuis aktif (${chosenModelName})! Memulai kuis 1/${activeValidQueue.length}...`);
        close();
        setTimeout(() => {
          window.location.href = activeValidQueue[0].url;
        }, 500);
      });
    }
    _renderEvaluations(evalItems, updateControls = true) {
      const evalContainer = this.shadow?.getElementById("eval-list-container");
      if (!evalContainer) return;
      if (evalItems && evalItems.length > 0) {
        this._renderEvalFilterPills(evalItems);
        this._renderEvalSummary(evalItems);
        if (updateControls) {
          this._renderEvalControls(evalItems);
        }
      }
      evalContainer.innerHTML = "";
      if (!evalItems || evalItems.length === 0) {
        evalContainer.innerHTML = '<div class="empty-state">Tidak ada kuis atau evaluasi ditemukan.</div>';
        this._visibleCourseCodes = [];
        this._updateToggleAllBtn();
        return;
      }
      let filtered = evalItems;
      if (this.evalFilter === "pending") {
        filtered = filtered.filter((e) => !e.completion && !e.locked);
      } else if (this.evalFilter === "done") {
        filtered = filtered.filter((e) => e.completion);
      }
      if (this.evalTypeFilter !== "all") {
        filtered = filtered.filter((e) => e.type === this.evalTypeFilter);
      }
      if (this.evalSearchQuery) {
        const q = this.evalSearchQuery;
        const typeKeywords = {
          PRE_TEST: "pre-test pre test pretest",
          POST_TEST: "post-test post test posttest",
          KUESIONER: "kuesioner kuisioner evaluasi survei angket"
        };
        filtered = filtered.filter((e) => {
          const title = (e.courseTitle || "").toLowerCase();
          const name = (e.name || "").toLowerCase();
          const sec = (e.sectionName || "").toLowerCase();
          const code = (e.courseCode || "").toLowerCase();
          const kw = typeKeywords[e.type] || "";
          return title.includes(q) || name.includes(q) || sec.includes(q) || code.includes(q) || kw.includes(q);
        });
      }
      if (filtered.length === 0) {
        this._visibleCourseCodes = [];
        this._updateToggleAllBtn();
        if (this.evalSearchQuery || this.evalTypeFilter !== "all") {
          evalContainer.innerHTML = `
          <div class="empty-state">
            <p>Tidak ada evaluasi yang cocok dengan pencarian atau filter tipe.</p>
            <button class="btn-config" id="btn-reset-eval-filters" style="margin-top:12px;">Reset Filter & Pencarian</button>
          </div>
        `;
          evalContainer.querySelector("#btn-reset-eval-filters")?.addEventListener("click", () => {
            this.evalSearchQuery = "";
            this.evalTypeFilter = "all";
            this.evalFilter = "all";
            this.expandedCourses.clear();
            const input = this.shadow?.getElementById("eval-search-input");
            if (input) input.value = "";
            const clear = this.shadow?.getElementById("eval-search-clear");
            if (clear) clear.style.display = "none";
            const sel = this.shadow?.getElementById("eval-type-select");
            if (sel) sel.value = "all";
            this._renderEvaluations(this.evaluations, true);
          });
        } else {
          const filterLabel = this.evalFilter === "pending" ? "belum dikerjakan" : "sudah selesai";
          evalContainer.innerHTML = `<div class="empty-state">Tidak ada evaluasi yang ${filterLabel}.</div>`;
        }
        return;
      }
      const grouped = {};
      filtered.forEach((e) => {
        if (!grouped[e.courseCode]) {
          grouped[e.courseCode] = { courseTitle: e.courseTitle, items: [] };
        }
        grouped[e.courseCode].items.push(e);
      });
      const courseCodes = Object.keys(grouped);
      this._visibleCourseCodes = courseCodes;
      if (this.evalSearchQuery) {
        courseCodes.forEach((code) => this.expandedCourses.add(code));
      }
      const typeIcons = {
        PRE_TEST: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        POST_TEST: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        KUESIONER: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
      };
      const typeLabels = {
        PRE_TEST: "Pre-Test",
        POST_TEST: "Post-Test",
        KUESIONER: "Kuesioner"
      };
      for (const courseCode of courseCodes) {
        const group = grouped[courseCode];
        const pendingInCourse = group.items.filter((e) => !e.completion && !e.locked).length;
        const isExpanded = this.expandedCourses.has(courseCode);
        const card = document.createElement("div");
        card.className = "eval-course-card";
        card.dataset.course = courseCode;
        const header = document.createElement("div");
        header.className = "eval-accordion-header";
        header.dataset.course = courseCode;
        header.innerHTML = `
        <div class="eval-accordion-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span title="${group.courseTitle}">${group.courseTitle}</span>
        </div>
        <div class="eval-accordion-meta">
          ${pendingInCourse > 0 ? `<span class="badge badge-pending">${pendingInCourse} Belum</span>` : `<span class="badge badge-done">Selesai Semua</span>`}
          <span class="badge" style="background:rgba(255,255,255,0.06); color:#aaa;">${group.items.length} Item</span>
          <svg class="eval-accordion-chevron ${isExpanded ? "open" : ""}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;
        const content = document.createElement("div");
        content.className = `eval-accordion-content ${isExpanded ? "open" : ""}`;
        const bySection = {};
        group.items.forEach((item) => {
          const secKey = item.sectionName || "Lainnya";
          if (!bySection[secKey]) bySection[secKey] = [];
          bySection[secKey].push(item);
        });
        for (const secName of Object.keys(bySection)) {
          const secLabel = document.createElement("div");
          secLabel.className = "eval-section-label";
          secLabel.textContent = secName;
          content.appendChild(secLabel);
          bySection[secName].forEach((e) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "eval-item";
            let btnHtml = "";
            if (e.completion) {
              btnHtml = `<span class="eval-btn-action eval-btn-done">Selesai</span>`;
            } else if (e.locked) {
              btnHtml = `<span class="eval-btn-action eval-btn-locked" title="${e.lockReason || "Terkunci"}">Terkunci</span>`;
            } else {
              const url = e.type === "KUESIONER" ? `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/kuesioner/${e.subId}` : `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/exam/${e.subId}`;
              btnHtml = `<a class="eval-btn-action" target="_self" href="${url}">Kerjakan</a>`;
            }
            itemDiv.innerHTML = `
            <div class="eval-item-info">
              <div class="eval-item-title">
                ${typeIcons[e.type] || ""}
                ${typeLabels[e.type] || e.type}
                ${e.completion ? '<span class="badge badge-done">Selesai</span>' : e.locked ? '<span class="badge badge-locked">Terkunci</span>' : '<span class="badge badge-pending">Belum</span>'}
              </div>
              <div class="eval-item-meta">${e.name} &bull; ${secName}</div>
            </div>
            ${btnHtml}
          `;
            content.appendChild(itemDiv);
          });
        }
        header.addEventListener("click", () => {
          this._userModifiedAccordion = true;
          const isCurrentlyOpen = content.classList.contains("open");
          evalContainer.querySelectorAll(".eval-course-card").forEach((otherCard) => {
            otherCard.querySelector(".eval-accordion-content")?.classList.remove("open");
            otherCard.querySelector(".eval-accordion-chevron")?.classList.remove("open");
          });
          this.expandedCourses.clear();
          if (!isCurrentlyOpen) {
            content.classList.add("open");
            header.querySelector(".eval-accordion-chevron")?.classList.add("open");
            this.expandedCourses.add(courseCode);
          }
          this._updateToggleAllBtn();
        });
        card.appendChild(header);
        card.appendChild(content);
        evalContainer.appendChild(card);
      }
      this._updateToggleAllBtn();
    }
    // ─── Session Warning ──────────────────────────────────────────────────────────
    _showSessionWarning(msg) {
      const forumContainer = this.shadow?.getElementById("forum-list-container");
      if (!forumContainer || this.shadow?.getElementById("mentari-session-banner")) return;
      const banner = document.createElement("div");
      banner.id = "mentari-session-banner";
      banner.style.cssText = `
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      color: #fbbf24;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;
      banner.innerHTML = `
      <span>${msg}</span>
      <button id="btn-sync-token-banner" style="background:#f59e0b; color:#121212; border:none; border-radius:6px; padding:4px 10px; font-weight:700; cursor:pointer; font-size:11px; white-space:nowrap;">Pindai Ulang</button>
    `;
      forumContainer.prepend(banner);
      banner.querySelector("#btn-sync-token-banner")?.addEventListener("click", async () => {
        const btn = banner.querySelector("#btn-sync-token-banner");
        if (btn) btn.textContent = "Memindai...";
        window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
        await new Promise((r) => setTimeout(r, 600));
        banner.remove();
        await this._loadCoursesAndForums();
      });
    }
    // ─── Data Fetching ────────────────────────────────────────────────────────────
    async _prefetchData() {
      if (this.isOpen) {
        this._loadCoursesAndForums();
      } else {
        this._fetchDataInternal(true);
      }
    }
    async _loadCoursesAndForums() {
      return this._fetchDataInternal(false);
    }
    /**
     * Mengambil nama lengkap & NIM mahasiswa dari berbagai sumber handal (localStorage, DOM, JWT)
     */
    async _resolveStudentIdentity(token) {
      if (this._studentName && this._studentNim) return;
      try {
        if (typeof localStorage !== "undefined") {
          const rawInfo = localStorage.getItem("mentari_user_info") || localStorage.getItem("user");
          if (rawInfo) {
            const parsed = JSON.parse(rawInfo);
            this._studentName = parsed.nama || parsed.name || parsed.fullname || parsed.full_name || this._studentName;
            this._studentNim = parsed.nim || parsed.username || this._studentNim;
          }
        }
      } catch {
      }
      try {
        if (!this._studentName && typeof document !== "undefined") {
          const profileEl = document.querySelector(".MuiAvatar-root")?.parentElement;
          if (profileEl) {
            const t = profileEl.textContent.trim();
            if (t && t.length > 2 && !t.includes("Login")) {
              this._studentName = t;
            }
          }
        }
      } catch {
      }
      if (token) {
        const payload = UnpamAuth.decodeJwtPayload(token);
        if (payload) {
          if (!this._studentName) {
            this._studentName = payload.fullname || payload.full_name || payload.name || payload.nama || "";
          }
          if (!this._studentNim) {
            this._studentNim = payload.nim || payload.username || "";
          }
        }
      }
    }
    async _fetchDataInternal(silent = false) {
      if (this._currentFetchPromise) {
        return this._currentFetchPromise;
      }
      this._currentFetchPromise = (async () => {
        const forumContainer = this.shadow?.getElementById("forum-list-container");
        const courseContainer = this.shadow?.getElementById("course-list-container");
        try {
          let options = await UnpamAuth.getFetchOptions();
          if (!options.headers["Authorization"]) {
            window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
            await new Promise((r) => setTimeout(r, 600));
            options = await UnpamAuth.getFetchOptions();
          }
          if (!options.headers["Authorization"]) {
            if (!silent && forumContainer && (!this.courses || this.courses.length === 0)) {
              const notFoundHtml = `
              <div style="text-align:center; padding:32px 16px; color:#f59e0b; line-height:1.6;">
                <div style="font-weight:700; font-size:14px; margin-bottom:6px;">Sesi Login Belum Terdeteksi</div>
                <div style="font-size:12px; color:#aaa; max-width:400px; margin:0 auto 14px;">
                  Silakan klik menu perkuliahan/dashboard di halaman Mentari atau refresh halaman agar ekstensi dapat menyadap token aktif kamu secara otomatis.
                </div>
                <button class="btn-config" id="btn-retry-scan" style="margin:0 auto;">Pindai Sesi Sekarang</button>
              </div>
            `;
              forumContainer.innerHTML = notFoundHtml;
              if (courseContainer) courseContainer.innerHTML = notFoundHtml;
              const handleRetry = async () => {
                UnpamAuth._cachedToken = null;
                await this._loadCoursesAndForums();
              };
              forumContainer.querySelector("#btn-retry-scan")?.addEventListener("click", handleRetry);
              courseContainer?.querySelector("#btn-retry-scan")?.addEventListener("click", handleRetry);
            }
            return;
          }
          const rawToken = await UnpamAuth.getAuthToken();
          await this._resolveStudentIdentity(rawToken);
          const res = await fetch("https://mentari.unpam.ac.id/api/user-course?page=1&limit=50", options);
          if (res.status === 401) {
            const currentToken2 = await UnpamAuth.getAuthToken();
            if (currentToken2 && !UnpamAuth.isTokenValid(currentToken2)) {
              UnpamAuth.clearInvalidToken();
            }
            window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
            if (!silent) {
              this._showSessionWarning("Sesi login perlu disegarkan. Klik sembarang menu Mentari atau tombol Pindai Ulang.");
              if (courseContainer && (!this.courses || this.courses.length === 0)) {
                courseContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#f59e0b;">Sesi perlu disegarkan. Silakan klik tombol Pindai Ulang di tab Forum atau buka menu perkuliahan.</div>';
              }
            }
            return;
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Gagal memuat mata kuliah.`);
          }
          const resData = await res.json();
          const list = Array.isArray(resData) ? resData : resData.data || [];
          this.courses = list;
          if (list.length === 0) {
            if (!silent) {
              if (forumContainer) forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
              if (courseContainer) courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif.</div>';
            }
            return;
          }
          if (this.isOpen) {
            this._renderCourses(list);
          }
          const forumItems = [];
          const evalItems = [];
          const chunkSize = 3;
          const storeComp = await Storage.get("mentari_completed_quiz_ids");
          const completedQuizIds = Array.isArray(storeComp?.mentari_completed_quiz_ids) ? storeComp.mentari_completed_quiz_ids : [];
          const staleCompletedQuizIds = /* @__PURE__ */ new Set();
          for (let i = 0; i < list.length; i += chunkSize) {
            const chunk = list.slice(i, i + chunkSize);
            await Promise.allSettled(chunk.map(async (c) => {
              const courseCode = c.kode_course || c.kode || c.course_code || c.id;
              const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
              try {
                const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(courseCode)}`, options);
                if (!cRes.ok) return;
                const cData = await cRes.json();
                const sections = Array.isArray(cData) ? cData : cData.data || [];
                const forumCandidates = [];
                const knownMeetings = /* @__PURE__ */ new Set();
                const activeMeetingNums = /* @__PURE__ */ new Set();
                for (const section of sections) {
                  let meetingNum = null;
                  const match = (section.nama_section || "").match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
                  if (match) {
                    meetingNum = parseInt(match[1], 10);
                  } else if (typeof section.urutan === "number" && section.urutan > 0) {
                    meetingNum = section.urutan;
                  }
                  if (meetingNum !== null) knownMeetings.add(meetingNum);
                  const subSections = section.sub_section || [];
                  const sectionName = section.nama_section || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${section.urutan || ""}`);
                  for (const sub of subSections) {
                    if (sub.kode_template === "FORUM_DISKUSI" && sub.id) {
                      forumCandidates.push({
                        sub,
                        meetingNum,
                        sectionName
                      });
                    }
                    if (["PRE_TEST", "POST_TEST", "KUESIONER"].includes(sub.kode_template) && sub.id) {
                      const isLocked = !!(sub.warningAlert && sub.warningAlert.length > 0);
                      const isLmsCompleted = Boolean(
                        sub.completion === true || sub.completion === 1 || sub.completion === "1" || sub.completion === "true" || sub.is_completed === true || sub.completed === true || sub.is_done === true || sub.status === "completed" || sub.status === "done" || sub.nilai !== void 0 && sub.nilai !== null && sub.nilai !== "" || sub.score !== void 0 && sub.score !== null && sub.score !== "" || Array.isArray(sub.history) && sub.history.length > 0
                      );
                      if (!isLmsCompleted && completedQuizIds.includes(sub.id)) {
                        staleCompletedQuizIds.add(sub.id);
                      }
                      evalItems.push({
                        courseCode,
                        courseTitle,
                        sectionName,
                        subId: sub.id,
                        type: sub.kode_template,
                        name: sub.nama_sub_section || sub.judul || sub.kode_template,
                        completion: isLmsCompleted,
                        locked: isLocked,
                        lockReason: sub.warningAlert || ""
                      });
                    }
                  }
                }
                const courseForumItems = [];
                await Promise.allSettled(forumCandidates.map(async (fc) => {
                  const { sub, meetingNum, sectionName } = fc;
                  const isLmsCompleted = Boolean(sub.completion === true);
                  let isAnswered = isLmsCompleted;
                  let hasTopics = true;
                  let topicDetails = [];
                  if (!isLmsCompleted) {
                    try {
                      const topicRes = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${sub.id}`, options);
                      if (topicRes.ok) {
                        const topicData = await topicRes.json();
                        const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
                        hasTopics = topics.length > 0;
                        if (hasTopics) {
                          topicDetails = topics.map((t) => ({
                            id: t.id,
                            title: t.judul || t.title || t.name || "",
                            message: t.deskripsi || t.pesan || t.message || t.content || t.body || ""
                          }));
                        }
                        if (hasTopics && (this._studentName || this._studentNim)) {
                          const searchName = (this._studentName || "").toLowerCase();
                          const searchNim = (this._studentNim || "").toLowerCase();
                          const replyResults = await Promise.allSettled(topics.map(async (topic) => {
                            try {
                              const replyRes = await fetch(`https://mentari.unpam.ac.id/api/forum/reply/${topic.id}`, options);
                              if (replyRes.ok) {
                                const replyData = await replyRes.json();
                                const replies = replyData.replies || replyData.data || (Array.isArray(replyData) ? replyData : []);
                                return replies.filter((r) => {
                                  const rName = (r.fullname || r.nama || "").toLowerCase();
                                  const rNim = (r.nim || r.username || "").toLowerCase();
                                  return searchName && rName.includes(searchName) || searchNim && rNim === searchNim;
                                }).length;
                              }
                            } catch {
                            }
                            return 0;
                          }));
                          let totalReplies = 0;
                          for (const r of replyResults) {
                            if (r.status === "fulfilled") {
                              totalReplies += r.value;
                            }
                          }
                          if (totalReplies >= 2) {
                            isAnswered = true;
                          }
                        }
                      }
                    } catch {
                    }
                  }
                  if (hasTopics) {
                    if (meetingNum !== null) activeMeetingNums.add(meetingNum);
                    courseForumItems.push({
                      courseCode,
                      courseTitle,
                      sectionName,
                      meetingNum,
                      forumId: sub.id,
                      forumName: sub.nama_sub_section || sub.judul || "Forum Diskusi",
                      completion: isLmsCompleted,
                      answered: isAnswered,
                      topics: topicDetails
                    });
                  }
                }));
                const unavailableMeetings = [];
                for (const mNum of knownMeetings) {
                  if (!activeMeetingNums.has(mNum)) {
                    unavailableMeetings.push(mNum);
                  }
                }
                const unavailableRanges = this._computeUnavailableRanges(unavailableMeetings);
                this.courseForumsMeta[courseCode] = {
                  courseTitle,
                  totalSections: sections.length,
                  activeCount: courseForumItems.length,
                  unavailableRanges
                };
                forumItems.push(...courseForumItems);
              } catch (err) {
              }
            }));
          }
          if (staleCompletedQuizIds.size > 0) {
            const cleanedCompletedIds = completedQuizIds.filter((id) => !staleCompletedQuizIds.has(id));
            await Storage.set({ mentari_completed_quiz_ids: cleanedCompletedIds });
            console.log(`[Mentari] Auto-pruned ${staleCompletedQuizIds.size} uncompleted quiz ID(s) from local storage. Server UNPAM authoritative status: Incomplete.`);
          }
          this.activeForums = forumItems;
          this.evaluations = evalItems;
          this._lastSyncedAt = Date.now();
          if (this.isOpen) {
            this._renderForums(forumItems, list);
            this._renderEvaluations(evalItems);
          }
          const currentToken = await UnpamAuth.getAuthToken();
          const userId = UnpamAuth.getUserIdentifier(currentToken);
          const cacheKey = `mentari_cached_data_${userId}`;
          Storage.set({
            [cacheKey]: {
              courses: list,
              forums: forumItems,
              evaluations: evalItems,
              courseForumsMeta: this.courseForumsMeta,
              lastSyncedAt: this._lastSyncedAt,
              updatedAt: Date.now()
            },
            mentari_cached_courses: list,
            mentari_cached_forums: forumItems
          });
        } catch (e) {
          if (!silent && forumContainer && (!this.courses || this.courses.length === 0)) {
            forumContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
            if (courseContainer) courseContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
          }
        } finally {
          this._currentFetchPromise = null;
        }
      })();
      return this._currentFetchPromise;
    }
  };
  if (typeof window !== "undefined") {
    new MentariDashboard();
  }
})();
/*! Bundled license information:

jszip/dist/jszip.min.js:
  (*!
  
  JSZip v3.10.2 - A JavaScript class for generating and reading zip files
  <http://stuartk.com/jszip>
  
  (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
  Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
  
  JSZip uses the library pako released under the MIT license :
  https://github.com/nodeca/pako/blob/main/LICENSE
  *)
*/
