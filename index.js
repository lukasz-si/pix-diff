var BlinkDiff = require('blink-diff'),
    PNGImage = require('png-image'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    util = require('util');

/**
 * Pix-diff protractor plugin class
 *
 * @constructor
 * @class PixDiff
 * @param {object} options
 * @param {string} options.basePath Path to screenshots folder
 * @param {string} options.width Width of browser
 * @param {string} options.height Height of browser
 *
 * @property {string} _basePath
 * @property {int} _width
 * @property {int} _height
 * @property {object} _capabilities
 * @property {webdriver|promise} _flow
 */
function PixDiff(options) {
    this._basePath = options.basePath;
    assert.ok(options.basePath, "Image base path not given.");

    this._width = options.width || 1280;
    this._height = options.height || 1024;

    this._capabilities = null;

    this._flow = browser.controlFlow();

    // init
    browser.driver.manage().window().setSize(this._width, this._height)
        .then(function () {
            return browser.getCapabilities()
        })
        .then(function (data) {
            return this._capabilities = data.caps_;
        }.bind(this));
}

PixDiff.prototype = {

    /**
     * Merges non-default options from optionsB into optionsA
     *
     * @method _mergeDefaultOptions
     * @param {object} optionsA
     * @param {object} optionsB
     * @return {object}
     * @private
     */
    _mergeDefaultOptions: function (optionsA, optionsB) {
        var option;

        optionsB = (typeof optionsB === 'object') ? optionsB : {};

        for (option in optionsB) {
            if (!optionsA.hasOwnProperty(option)) {
                optionsA[option] = optionsB[option];
            }
        }
        return optionsA;
    },

    /**
     * Check if image exists: if yes then comparison is run, if not then image is saved
     * @param tag
     * @param options
     * @returns Promise
     */
    saveScreenOrCheckIfExists: function (tag, options) {
        var imageName = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
        var imagePath = path.join(this._basePath, imageName);

        if (fs.existsSync(imagePath)) {
            return this.checkScreen(tag, options);
        } else {
            return this.saveScreen(tag);
        }
    },
    /**
     * Saves an image of the screen
     *
     * @method saveScreen
     * @example
     *     browser.pixdiff.saveScreen('imageA');
     *
     * @param {string} tag
     * @public
     */
    saveScreen: function (tag) {
        return this._flow.execute(function () {
            return browser.takeScreenshot()
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    return new PNGImage({
                        imagePath: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, tag)
                    }).runWithPromise();
                }.bind(this));
        }.bind(this));
    },

    /**
     * Saves an image of the screen region
     *
     * @method saveRegion
     * @example
     *     browser.pixdiff.saveRegion(element(By.id('elementId')), 'imageA');
     *
     * @param {promise} element
     * @param {string} tag
     * @public
     */
    saveRegion: function (element, tag) {
        var size,
            rect;

        return this._flow.execute(function () {
            return element.getSize()
                .then(function (elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function (point) {
                    rect = {height: size.height, width: size.width, x: Math.floor(point.x), y: Math.floor(point.y)};
                    return browser.takeScreenshot();
                })
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    return new PNGImage({
                        imagePath: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, tag),
                        cropImage: rect
                    }).runWithPromise();
                }.bind(this));
        }.bind(this));
    },

    /**
     * Runs the comparison against the screen
     *
     * @method checkScreen
     * @example
     *     browser.pixdiff.checkScreen('imageA', {debug: true});
     *
     * @param {string} tag
     * @param {object} options
     * @return {object} result
     * @public
     */
    checkScreen: function (tag, options) {
        var defaults;

        return this._flow.execute(function () {
            return browser.takeScreenshot()
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    defaults = {
                        imageAPath: path.join(this._basePath, tag),
                        imageB: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, 'diff', path.basename(tag)),
                        imageOutputLimit: BlinkDiff.OUTPUT_DIFFERENT
                    };
                    return new BlinkDiff(this._mergeDefaultOptions(defaults, options)).runWithPromise();
                }.bind(this))
                .then(function (result) {
                    return result;
                });
        }.bind(this));
    },

    /**
     * Runs the comparison against a region
     *
     * @method checkRegion
     * @example
     *     browser.pixdiff.checkRegion(element(By.id('elementId')), 'imageA', {debug: true});
     *
     * @param {promise} element
     * @param {string} tag
     * @param {object} options
     * @return {object}
     * @public
     */
    checkRegion: function (element, tag, options) {
        var size,
            rect,
            defaults;

        return this._flow.execute(function () {
            return element.getSize()
                .then(function (elementSize) {
                    size = elementSize;
                    return element.getLocation();
                })
                .then(function (point) {
                    rect = {height: size.height, width: size.width, x: Math.floor(point.x), y: Math.floor(point.y)};
                    return browser.takeScreenshot();
                })
                .then(function (image) {
                    tag = util.format('%s-%s-%sx%s.png', tag, this._capabilities.browserName, this._width, this._height);
                    defaults = {
                        imageAPath: path.join(this._basePath, tag),
                        imageB: new Buffer(image, 'base64'),
                        imageOutputPath: path.join(this._basePath, 'diff', path.basename(tag)),
                        imageOutputLimit: BlinkDiff.OUTPUT_DIFFERENT,
                        cropImageB: rect
                    };
                    return new BlinkDiff(this._mergeDefaultOptions(defaults, options)).runWithPromise();
                }.bind(this))
                .then(function (result) {
                    return result;
                });
        }.bind(this));
    }
};

/**
 * Jasmine/Mocha-Chai PixDiff matchers
 */
(function () {
    var v1 = {
            toMatchScreen: function () {
                var result = this.actual,
                    percent = +((result.differences / result.dimension) * 100).toFixed(2);
                this.message = function () {
                    return util.format("Image is visibly different by %s pixels, %s %", result.differences, percent);
                };
                return ((result.code === BlinkDiff.RESULT_IDENTICAL) || (result.code === BlinkDiff.RESULT_SIMILAR));
            },

            toNotMatchScreen: function () {
                var result = this.actual;
                this.message = function () {
                    return "Image is identical or near identical";
                };
                return ((result.code === BlinkDiff.RESULT_DIFFERENT) && (result.code !== BlinkDiff.RESULT_UNKNOWN));
            }
        },
        v2 = {
            toMatchScreen: function () {
                return {
                    compare: function (actual, expected) {
                        var percent = +((actual.differences / actual.dimension) * 100).toFixed(2);
                        return {
                            pass: ((actual.code === BlinkDiff.RESULT_IDENTICAL) || (actual.code === BlinkDiff.RESULT_SIMILAR)),
                            message: util.format("Image is visibly different by %s pixels, %s %", actual.differences, percent)
                        };
                    }
                }
            },

            toNotMatchScreen: function () {
                return {
                    compare: function (actual, expected) {
                        return {
                            pass: ((actual.code === BlinkDiff.RESULT_DIFFERENT) && (actual.code !== BlinkDiff.RESULT_UNKNOWN)),
                            message: "Image is identical or near identical"
                        };
                    }
                }
            }
        };

    if (typeof beforeEach === "function") {
        beforeEach(function () {
            if (/^2/.test(jasmine.version)) {
                jasmine.addMatchers(v2);
            } else {
                this.addMatchers(v1);
            }
        });
    } else {
        var chaiGlobal = require('chai');

        chaiGlobal.use(function (chai, utils) {
            var assert = chai.assert;

            chai.Assertion.addMethod('toMatchScreen', function () {
                var actual = utils.flag(this, 'object');
                assertImage(actual);
            });

            assert.toMatchScreen = assertImage;

            function assertImage(actual) {
                // if "actual" is "undefined" should skip assertion because it is saveScreen() or saveRegion()
                if (actual) {
                    var percent = +((actual.differences / actual.dimension) * 100).toFixed(2);
                    assert(
                        ((actual.code === BlinkDiff.RESULT_IDENTICAL) || (actual.code === BlinkDiff.RESULT_SIMILAR)),
                        util.format("Image is visibly different by %s pixels, %s %", actual.differences, percent),
                        "Image is identical or near identical"
                    );
                }
            }
        });
    }
})();

module.exports = PixDiff;