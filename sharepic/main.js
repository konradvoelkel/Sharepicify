const experimental = Boolean(localStorage.experimental);

class PicCreator {
  constructor(selector, template, exportRender = function() {}, startFormatIndex = 0) {
    const self = this;

    this.e = document.querySelector(selector);

    this.template = template;

    this.fonts = template.fonts;

    this.document = get(this.template.document);

    this.toolsList.innerHTML = "";

    this.previewContainer.innerHTML = "";


    var dataController;

    var currFormatIndex = startFormatIndex;

    (async () => {

      this.toolsList.append(PicCreator.createElement("li", {
        childs: [
          PicCreator.createElement("div", {
            className: "label",
            childs: [
              PicCreator.createElement("span", {}, "Format")
            ]
          }),
          PicCreator.createElement("div", {
            className: "controls",
            childs: [
              PicCreator.createElement("select", {
                eventListeners: [
                  {
                    type: "change",
                    callback() {
                      const selectedOption = Array.from(this.children).find(child => child.value == this.value);

                      currFormatIndex = Array.from(this.children).indexOf(selectedOption);

                      renderDoc(this.value);
                    }
                  }
                ],
                childs: this.template.documents.map(formatRecord => {
                  return PicCreator.createElement("option", {
                    attributes: {
                      value: formatRecord.src
                    }
                  }, formatRecord.alias)
                })
              })
            ]
          })
        ]
      }));



      // Rendering a SVG document
      const renderDoc = async (docUrl) => {

        const doc = await get(docUrl);

        this.previewContainer.innerHTML = doc;

        const viewBox = this.previewSVG.getAttribute("viewBox").split(" ").map(numberStr => parseInt(numberStr));

        (async () => {
          const fontSheet = document.createElement("style");
          fontSheet.classList.add("font-sheet");

          const fontFaces = (self.fonts || []).map(async fontObj => {

            const result = await request(fontObj.src, "arraybuffer");
            const byteArray = new Uint8Array(result.response);
            const base64Str = Uint8ToBase64(byteArray);

            const dataURL = 'data:' + fontObj.mime + ";base64," + base64Str;

            return `
              @font-face {
                font-family: "${ fontObj.name }";
                src: url("${ dataURL }");
              }
            `;
          });

          const fontsStr = (await Promise.all(fontFaces)).join("\n");

          fontSheet.innerHTML = fontsStr;

          this.previewSVG.insertBefore(fontSheet, this.previewMain);

          const hiddenArea = document.createElementNS("http://www.w3.org/2000/svg", "g");
          hiddenArea.classList.add("hidden-area");

          hiddenArea.innerHTML = `
            <rect x="-1000%" y="-1000%" width="1000%" height="2100%" style="fill: #fff;"/>
            <rect x="100%" y="-1000%" width="1000%" height="2100%" style="fill: #fff;"/>

            <rect x="-1000%" y="-1000%" width="2100%" height="1000%" style="fill: #fff;"/>
            <rect x="-1000%" y="100%" width="2100%" height="1000%" style="fill: #fff;"/>
          `;

          this.previewSVG.append(hiddenArea);



          // Debug
          this.previewSVG.addEventListener("click", event => {

            const boundings = this.previewSVG.getBoundingClientRect();

            const viewBoxFormat = viewBox[3] / viewBox[2];
            const boundingFormat = boundings.height / boundings.width;

            const potentialRealSizes = {
              // If bounding format < viewBoxFormat
              width: (boundingFormat / viewBoxFormat) * boundings.width,
              // If bounding format > viewBoxFormat
              height: (boundingFormat / viewBoxFormat) * boundings.height
            };

            const svgBounds = {
              width: (boundingFormat < viewBoxFormat) ? potentialRealSizes.width : potentialRealSizes.height,
              height: (boundingFormat > viewBoxFormat) ? potentialRealSizes.height : potentialRealSizes.width
            };
            svgBounds.x = boundings.x + (boundings.width - svgBounds.width) / 2;
            svgBounds.y = boundings.y + (boundings.height - svgBounds.height) / 2;


            const coords = {
              x: (event.clientX - svgBounds.x) * (viewBox[2] / svgBounds.width),
              y: (event.clientY - svgBounds.y) * (viewBox[3] / svgBounds.height),
            };



          });



        })();

        // Creating the data controller
        dataController = new Vue({
          el: this.previewMain,
          data: data,
          methods: {
            textInfo: PicCreator.textInfo,
            textToMultilineFormat: PicCreator.textToMultilineFormat,
            textFitWidth: PicCreator.textFitWidth,
            getDigits: PicCreator.getDigits
          },
          directives: {
            dynamic: dynamicDirective,
            fitimage: fitImageDirective
          },
          created() {
            //createdCallback();
          }
        });

        this.vueInstance = dataController;

        this.replaceURLsWithData();
      }
      this.renderDoc = renderDoc;

      // Initialize first format
      renderDoc(this.template.documents[startFormatIndex].src);

      const data = {
        width: 1200,
        height: 1200,
        get ratio() {
          return this.width / this.height;
        }
      };


      for (let field of this.template.fields) {
        try {
          data[field.key] = "default" in field ? field.default : field.properties.items[0].value;
        }
        catch (e) {

        }



        const settingLi = PicCreator.createSetting(field, function(value) {
          // Value return

          dataController[field.key] = value;

          setTimeout(function() {
            self.replaceURLsWithData();
          }, 500);

        });
        this.toolsList.append(settingLi);
      }


      this.toolsList.append(PicCreator.createElement("li", {
        childs: [
          PicCreator.createElement("div", {
            className: "label",
            childs: [
              PicCreator.createElement("span", {}, "Export")
            ]
          }),
          PicCreator.createElement("div", {
            className: "controls",
            childs: Export.filter(exportMethod => Boolean(exportMethod.experimental) ? experimental : true).map(function(exportMethod) {
              return PicCreator.createElement("button", {
                eventListeners: [
                  {
                    type: "click",
                    async callback(event) {
                      var maxTries = !exportMethod.clientSide ? 0 : 5;


                      var tries = 1;
                      const tryer = setInterval(async function() {

                        (async function() {
                          const result = await exportMethod.convert(self.previewContainer.getElementsByTagName("svg")[0], template.root + "?" + currFormatIndex, dataController);
                          exportRender(result);
                        })();

                        if (tries >= maxTries) {
                          clearInterval(tryer);
                        }
                        tries++;
                      }, 200);

                    }
                  }
                ]
              }, exportMethod.name)
            })
          })
        ]
      }));

      const dynamicDirective = {
        // directive definition
        inserted: function (el, binding) {

          const bounding = el.getBBox();

          const originAttrVal = el.getAttributeNS(null, "data-dynamic-origin");

          if (originAttrVal && originAttrVal.match(/[0-9]*.*\s[0-9]*.*/)) {
            // Get origin positions from attribute described as object
            const originRelative = originAttrVal.split(" ").map(posStr => {
              const strMatch = posStr.match(/([0-9]*)(.*)/);
              return {
                value: new Number(strMatch[1]) + 0,
                unit: strMatch[2]
              };
            });

            // Function to convert different kinds of units to an absolute number of pixels from a origin object
            function originToAbsolutePx(originPosObj) {
              // Handlers for specific units
              const unitHandlers = {
                ["%"](value) {
                  return bounding.width * (value / 100);
                },
                ["px"](value) {
                  return value;
                }
              };
              // If the requested unit is supported by the handlers
              if (originPosObj.unit in unitHandlers) {
                // Return the result of the handler method
                return unitHandlers[originPosObj.unit](originPosObj.value);
              }
            }
            // Object describing the absolute pixels of the element's origin
            const origin = {
              x: bounding.x + originToAbsolutePx(originRelative[0]),
              y: bounding.y + originToAbsolutePx(originRelative[1])
            };


            el.style.transformOrigin = origin.x + 'px ' + origin.y + 'px';
          }

          dynamicDirective.update(el, binding);
        },
        update: function (el, binding) {
          setTimeout(() => {

            const width = el.getAttributeNS(null, "data-dynamic-width");
            const height = el.getAttributeNS(null, "data-dynamic-height");

            const bounding = el.getBBox();

            // Required scales to reach max width / height
            const scales = {
              x: width / bounding.width,
              y: height / bounding.height
            };

            //console.log(el, bounding.width, bounding.height);

            // Scale to smaller scale (to prevent oversizing)
            el.style.transform = 'scale(' + Math.min(scales.x, scales.y) + ')';
          });



        }
      }

      const fitImageDirective = {
        inserted: async function(el, binding) {

          el.setAttributeNS(null, "width", "100%");
          el.setAttributeNS(null, "height", "100%");

          fitImageDirective.update(el, binding);

        },
        update: async function(el, binding) {

          const svgRoot = el.closest("svg");
          const viewBox = svgRoot.getAttribute("viewBox").split(" ").map(numberStr => parseInt(numberStr));
          const [width, height] = viewBox.slice(2);
          const size = Math.max(width, height);

          const viewBoxRatio = width / height;



          // Get current src attribute value of image element
          const imgSrc = el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
          // If current src is not the stored one, the src changed
          if (imgSrc != el.__imgSrc) {
            // Src was changed
            // Update stored src
            el.__imgSrc = imgSrc;
            // Save image information from current src
            el.imgInfo = await PicCreator.imageInfo(imgSrc);
          }


          const scaleFactor = el.imgInfo.ratio / viewBoxRatio;


          const relScaleFactor = Math.max(el.imgInfo.ratio, viewBoxRatio) / Math.min(el.imgInfo.ratio, viewBoxRatio);

          const overlay = [height, width][(scaleFactor == relScaleFactor) * 1] * (relScaleFactor - 1);

          const overlayOnEachSide = overlay / 2;
          const relOverlay = overlayOnEachSide / relScaleFactor;


          const translate = {
            x: relOverlay * (scaleFactor == relScaleFactor) * 1,
            y: relOverlay * !(scaleFactor == relScaleFactor) * 1
          };

          const imagePos = new Number(el.getAttributeNS(null, "data-image-pos"));

          el.style.transform = "scale(" + relScaleFactor + ") translate(" + (translate.x * imagePos) + "px, " + (translate.y * imagePos) + "px)";


        }
      };





    })();





  }
  async replaceURLsWithData() {

    const images = getElementByMethod(this.previewMain, e => {
      const href = e.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      return href ? href.search(/\./) > -1 : false;
    });
    for (let img of images) {

      const href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');


      const result = await request(href, "arraybuffer");
      const byteArray = new Uint8Array(result.response);
      const base64Str = Uint8ToBase64(byteArray);

      const headers = parseHeaders(result.headers);

      const dataURL = 'data:' + headers["content-type"] + ";base64," + base64Str;

      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataURL);

      //const mime =
    }
  }

  get toolsList() {
    return this.e.getElementsByClassName("tools")[0].getElementsByTagName("ul")[0];
  }
  get previewContainer() {
    return this.e.getElementsByClassName("preview")[0];
  }
  get previewSVG() {
    return this.previewContainer.getElementsByTagName("svg")[0];
  }
  get previewMain() {
    return this.previewSVG.getElementsByClassName("main")[0];
  }
  loadTools() {


  }
  static createSetting(field, callback) {
    return PicCreator.createElement("li", {
      childs: [
        PicCreator.createElement("div", {
          className: "label",
          childs: [
            PicCreator.createElement("span", {}, field.description)
          ]
        }),
        PicCreator.createElement("div", {
          className: "controls",
          childs: Components[field.type](field, callback)
        })
      ]
    })
  }
  static textInfo(str, style, debug = false) {

    //return getTextWidth(str, style);

    const text = document.createElement("span");
    //const text = document.querySelector("#test-text");
    if (typeof style == "object") {
      text.style.fontFamily = style.fontFamily;
      text.style.fontSize = style.fontSize;
    }
    else {
      text.style = style;
    }
    text.classList.add("test-text");
    text.innerHTML = str;

    if (debug) {
      console.log("debug...", style, text);
    }

    document.body.append(text);

    const bounding = text.getBoundingClientRect();

    const info = {
      width: bounding.width,
      height: bounding.height
    };

    document.body.removeChild(text);

    return info;
  }
  static textToMultilineFormat(text, targetFormat = 1, charsPerLine = 0.4, correctWay = false) {

    const chars = text.split("");

    const dividers = [];

    for (var i = 1; i <= chars.length; i++) {
      // How much chars per line would it be?
      /*const divideResult = chars.length / i;
      console.log(divideResult);
      // Round result to next integer
      const divideNextInt = Math.round(divideResult);
      // If this amount of chars per line already is listened, ignore it
      if (!dividers.includes(divideNextInt)) {
        dividers.push(divideNextInt);
      }*/
      dividers.push(i);
    }


    if (correctWay) {
      // Use the dividers (numbers that definitely divide the text to equal long parts) as wrapping borders
      const wraps = dividers.map(wrapBorder => {
        const linesAmount = Math.round(chars.length / wrapBorder);

        const wrappedLines = wordWrap(text, wrapBorder + 1).split("\n");

        const maxLength = Math.max(...wrappedLines.map(line => line.length));

        const linesInWidth = maxLength * charsPerLine;
        const format = wrappedLines.length / linesInWidth;

        return {
          wrapBorder: wrapBorder,
          format: format,
          lines: wrappedLines
        };
      });

      const closestWrap = wraps.sort((a, b) => {
        const formatDiffA = Math.abs(a.format - targetFormat);
        const formatDiffB = Math.abs(b.format - targetFormat);

        return formatDiffA > formatDiffB ? 1 : -1;
      })[0];


      return closestWrap.lines;
    }


    else {
      const bestWrap = dividers.map(wrapBorder => {

        const linesAmount = Math.round(chars.length / wrapBorder);

        const linesInWidth = wrapBorder * charsPerLine;
        const format = linesAmount / linesInWidth;


        return {
          linesAmount: linesAmount,
          format: format,
          wrapBorder: wrapBorder
        };
      }).sort((a, b) => {
        const formatDiffA = Math.abs(a.format - targetFormat);
        const formatDiffB = Math.abs(b.format - targetFormat);

        return formatDiffA > formatDiffB ? 1 : -1;
      })[0];

      //console.log(bestWrap.linesAmount);

      const lines = wordWrap(text, bestWrap.wrapBorder).split("\n");

      return lines;
    }



  }
  static getDigits(number) {

    if (!number) {
      return [];
    }

    const digits = [];

    var index = 0;

    while (number != 0) {
      const digit = number % 10;
      number = Math.trunc(number / 10);
      digits.push({
        digit: digit,
        index: index
      });

      index++;
    }

    return digits.length > 0 ? digits : [{
      digit: 0,
      index: 0
    }];
  }
  static imageInfo(url) {
    return new Promise(function(resolve, reject) {

      loadImage(url, function (img, data) {

        //console.log(data.originalWidth, data.originalHeight, data, img.width, img.height);
        resolve({
          data: img.toDataURL('image/png'),
          width: img.width,
          height: img.height,
          ratio: img.width / img.height
        });

      }, {
        orientation: true,
        maxWidth: 1200
      });

    });
  }
  static createElement(tagName, options, inner) {
    if (typeof options === "string") options = {
      className: options
    }
    options.attributes = options.attributes == undefined ? {} : options.attributes;
    options.childs = options.childs == undefined ? [] : options.childs;
    if (inner) options.childs.push(document.createTextNode(inner));
    options.eventListeners = options.eventListeners == undefined ? [] : options.eventListeners;
    options.className = options.className == undefined ? "" : options.className;
    var e = document.createElement(tagName);
    e.setAttribute("class", options.className);
    for (var i = 0; i < Object.keys(options.attributes).length; i++) {
      e.setAttribute(Object.keys(options.attributes)[i], options.attributes[Object.keys(options.attributes)[i]]);
    }
    for (let property in options.properties) {
      if (options.properties.hasOwnProperty(property)) {
        e[property] = options.properties[property];
      }
    }
    for (var i = 0; i < options.childs.length; i++) {
      if (typeof options.childs[i] == "string") {
        e.innerHTML += options.childs[i];
      }
      else {
        e.appendChild(options.childs[i]);
      }
    }
    for (var i = 0; i < options.eventListeners.length; i++) {
      e.addEventListener(options.eventListeners[i].type, options.eventListeners[i].callback);
    }
    return e;
  }

  static textFitWidth(str, width, style = {}) {
    const span = document.createElement("span");
    span.style.fontFamily = style.fontFamily;
    span.classList.add("test-text-fit");
    span.append(str);
    document.body.append(span);

    var fontSize = 11;

    while (span.getBoundingClientRect().width < width) {
      fontSize++;

      span.style.fontSize = fontSize + "px";

    }

    const result = {
      bounding: span.getBoundingClientRect(),
      fontSize: span.style.fontSize
    };

    document.body.removeChild(span);


    return result;
  }

}
PicCreator.templates = {};


function get(url, type = null) {

  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = type;
    xhr.open("GET", url, true);
    xhr.addEventListener("load", function() {
      resolve(this.response);
    });
    xhr.send();
  });
}

function request(url, type) {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = type;
    xhr.open("GET", url, true);
    xhr.addEventListener("load", function() {
      resolve({
        response: this.response,
        headers: this.getAllResponseHeaders()
      });
    });
    xhr.send();
  });
}




const Components = {
  file(field, callback) {
    return [
      PicCreator.createElement("button", {
        className: "btn",
        eventListeners: [
          {
            type: "click",
            callback(event) {
              this.parentNode.getElementsByTagName("input")[0].click();
            }
          }
        ]
      }, "Bild auswählen"),
      PicCreator.createElement("input", {
        attributes: {
          type: "file"
        },
        eventListeners: [
          {
            type: "change",
            callback(event) {
              const file = event.target.files[0];

              const reader = new FileReader();
              reader.addEventListener("load", async function(event) {
                const dataURL = event.target.result;
                //callback({});

                const imgInfo = await PicCreator.imageInfo(dataURL);

                callback({
                  info: imgInfo,
                  data: imgInfo.data
                });

              });

              reader.readAsDataURL(file);


            }
          }
        ]
      })
    ];
  },
  number(field, callback) {
    return [
      PicCreator.createElement("input", {
        attributes: {
          type: field.properties.kind == "slider" ? "range" : "number",
          value: field.properties.value,
          max: field.properties.max,
          min: field.properties.min,
          step: field.properties.step
        },
        eventListeners: [
          {
            type: "input",
            callback(event) {
              callback(parseFloat(this.value));
            }
          }
        ]
      })
    ];
  },
  text(field, callback) {

    return [
      PicCreator.createElement("textarea", {
        eventListeners: [
          {
            type: "input",
            callback(event) {
              const lines = this.value.split("\n");

              callback(lines);
            }
          }
        ]
      }, field.default.join("\n"))
    ];
  },
  ["dynamic-text"](field, callback) {
    const textarea = PicCreator.createElement("textarea", {
      eventListeners: [
        {
          type: "input",
          callback(event) {
            const lines = this.value.split("\n");

            const result = field.properties.formats.map(format => {
              return PicCreator.textToMultilineFormat(lines.join(" "), format, field.properties.charWidth, true);
            });

            //console.log(result);

            callback(result);
          }
        }
      ]
    }, field.default.join("\n"));

    setTimeout(function() {
      const initInputEvent = new Event('input');
      textarea.dispatchEvent(initInputEvent);
    }, 500);

    return [
      textarea
    ];
  },
  line(field, callback) {
    field.properties = field.properties || {};

    return [
      PicCreator.createElement("input", {
        attributes: {
          type: "text",
          value: field.default,
          length: field.properties.length
        },
        eventListeners: [
          {
            type: "input",
            callback(event) {
              callback(this.value);
            }
          }
        ]
      })
    ]
  },
  chars(field, callback) {
    return [
      PicCreator.createElement("input", {
        attributes: {
          type: "text",
          value: field.default
        },
        eventListeners: [
          {
            type: "input",
            callback(event) {
              callback(this.value);
            }
          }
        ]
      })
    ]
  },
  selection(field, callback) {
    return [
      PicCreator.createElement("div", {
        className: "selection",
        childs: field.properties.items.map(item => {
          return PicCreator.createElement("div", {
            className: "selection-item",
            properties: {
              item: item
            },
            childs: [
              PicCreator.createElement("div", {
                className: "selection-item-inner",
                attributes: {
                  style: "background-image: url('" + ({
                    value: item.render || item.value,
                    file: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzdmcgd2lkdGg9IjYwJSIgaGVpZ2h0PSI2MCUiIHk9IjIwJSIgeD0iMjAlIiB2aWV3Qm94PSIwIDAgMzE1LjU4IDMxNS41OCI+ICAgIAk8cGF0aCBmaWxsPSIjZmZmIiBkPSJNMzEwLjU4LDMzLjMzMUg1Yy0yLjc2MSwwLTUsMi4yMzgtNSw1djIzOC45MThjMCwyLjc2MiwyLjIzOSw1LDUsNWgzMDUuNThjMi43NjMsMCw1LTIuMjM4LDUtNVYzOC4zMzEgIAkJQzMxNS41OCwzNS41NjksMzEzLjM0MywzMy4zMzEsMzEwLjU4LDMzLjMzMXogTTI4NS41OCwyNDIuMzg2bC02OC43NjYtNzEuMjE0Yy0wLjc2LTAuNzg1LTIuMDAzLTAuODM2LTIuODIzLTAuMTE0bC00Ny42OTUsNDEuOTc5ICAJCWwtNjAuOTYyLTc1LjA2MWMtMC4zOTYtMC40OS0wLjk3NS0wLjc3LTEuNjMtMC43NTZjLTAuNjMxLDAuMDEzLTEuMjIsMC4zMTYtMS41OTcsMC44MjJMMzAsMjM0Ljc5N1Y2My4zMzFoMjU1LjU4VjI0Mi4zODZ6Ii8+ICAJPHBhdGggZD0iTTIxMC4wNTksMTM1LjU1NWMxMy41MzgsMCwyNC41MjktMTAuOTgyLDI0LjUyOS0yNC41MzFjMC0xMy41NDUtMTAuOTkxLTI0LjUzMy0yNC41MjktMjQuNTMzICAJCWMtMTMuNTQ5LDAtMjQuNTI4LDEwLjk4OC0yNC41MjgsMjQuNTMzQzE4NS41MzEsMTI0LjU3MiwxOTYuNTExLDEzNS41NTUsMjEwLjA1OSwxMzUuNTU1eiIgZmlsbD0iI2ZmZiIvPiAgICA8L3N2Zz48L3N2Zz4="
                  })[item.type] + "')"
                }
              })
            ],
            eventListeners: [
              {
                type: "click",
                async callback() {
                  const self = this;

                  const typeHandlers = {
                    value() {
                      return new Promise(function(resolve, reject) {
                        resolve(self.item.value);

                      });
                    },
                    file() {
                      return new Promise(function(resolve, reject) {
                        //const fileInput = document.createElement("input");
                        const fileInput = document.querySelector("#hidden-file-input");
                        //fileInput.type = "file";

                        //console.log(fileInput);
                        //alert(fileInput);


                        fileInput.addEventListener("change", function(event) {

                          const file = event.target.files[0];
                          //console.log(file);
                          //alert(file);

                          const reader = new FileReader();
                          reader.addEventListener("load", async function(event) {
                            const dataURL = event.target.result;

                            //console.log(dataURL.length);
                            //alert(dataURL.length);

                            const imgInfo = await PicCreator.imageInfo(dataURL);

                            //console.log(imgInfo);
                            //alert(imgInfo);

                            resolve({
                              info: imgInfo,
                              type: "dataURL",
                              value: imgInfo.data
                            });
                          });

                          reader.readAsDataURL(file);
                        })

                        fileInput.click();

                      });
                    }
                  }

                  const result = await typeHandlers[item.type]();

                  //console.log(result);

                  callback(result);
                }
              }
            ]
          })
        })
      })
    ];
  },
  checklist(field, callback) {
    const checks = field.default;

    return [
      PicCreator.createElement("ul", {
        className: "checklist",
        childs: field.properties.fields.map((checkItem, index) => {
          return PicCreator.createElement("li", {
            childs: [
              PicCreator.createElement("input", {
                attributes: {
                  type: "checkbox",
                  checked: checks[index]
                },
                eventListeners: [
                  {
                    type: "change",
                    callback() {
                      checks[index] = this.checked;

                      const resultArray = new Array(checks.length).fill(true).map((item, i) => checks[i]);
                      callback(resultArray);

                    }
                  }
                ]
              }),
              PicCreator.createElement("span", {

              }, checkItem)
            ]
          })
        })
      })
    ]
  },
  map(field, callback) {

    const routeData = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": []
      }
    };

    const pointsData = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [-77.03238901390978, 38.913188059745586]
          },
          "properties": {
            "title": "Start",
            "icon": "circle"
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [-122.414, 37.776]
          },
          "properties": {
            "title": "End",
            "icon": "embassy"
          }
        }
      ]
    };
    var route = [];
    var map;

    mapboxgl.accessToken = 'pk.eyJ1IjoibWF1cmljZS1jb25yYWQiLCJhIjoiY2lpM25jbXVpMDExZXQ4bTBmYzd5cjBhbSJ9.zW17SmAFJRJPf8VjAxpang';

    const mapContainer = PicCreator.createElement("div", {
      className: "route-map",
      attributes: {
        //style: 'position: fixed; left: 50px; top: 50px; width: 1000px; height: 800px;',
        id: "map"
      },
      childs: []
    });

    function updateRoute() {

      // Set the route's coordinates in dataset to current route
      routeData.geometry.coordinates = route;
      // Update dataset for route
      map.getSource('route').setData(routeData);

      // Set first point's coordinates in dataset to first point's one
      pointsData.features[0].geometry.coordinates = route[0];

      // Set last point's coordinates in dataset to last point's one
      pointsData.features[pointsData.features.length - 1].geometry.coordinates = route[route.length - 1];

      // Update dataset for all points
      map.getSource('points').setData(pointsData);

    }



    const btns = PicCreator.createElement("div", {
      className: "map-controls",
      childs: [
        PicCreator.createElement("div", {
          className: "btn-map",
          eventListeners: [
            {
              type: "click",
              callback(event) {

                // Remove last point from route
                route = route.slice(0, route.length - 1);

                updateRoute();
              }
            }
          ],
          childs: [
            PicCreator.createElement("img", {
              className: "btn-icon",
              attributes: {
                src: "icons/back-arrow.svg"
              }
            })
          ]
        }),
        PicCreator.createElement("div", {
          className: "btn-map",
          eventListeners: [
            {
              type: "click",
              callback(event) {

                // Clear route
                route = [];

                updateRoute();
              }
            }
          ],
          childs: [
            PicCreator.createElement("img", {
              className: "btn-icon",
              attributes: {
                src: "icons/garbage.svg"
              }
            })
          ]
        }),/*
        PicCreator.createElement("div", {
          className: "map-input",
          childs: [
            PicCreator.createElement("span", {
              className: "input-label"
            }, "Rendering Zoom"),
            PicCreator.createElement("input", {
              className: "input-field",
              attributes: {
                type: "number",
                value: 14,
                step: 0.25
              },
              eventListeners: [
                {
                  type: "input",
                  callback(event) {
                    console.log(event);
                  }
                }
              ]
            })
          ]
        }),*/
        PicCreator.createElement("div", {
          className: "btn-map",
          eventListeners: [
            {
              type: "click",
              callback(event) {

                const geoJSON = {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {},
                      "geometry": {
                        "type": "LineString",
                        "coordinates": route
                      }
                    },
                    {
                      "type": "Feature",
                      "geometry": {
                        "type": "Point",
                        "coordinates": route[0]
                      },
                      "properties": {
                        "title": "Start",
                        "icon": "airfield-15"
                      }
                    },
                    {
                      "type": "Feature",
                      "geometry": {
                        "type": "Point",
                        "coordinates": route[route.length - 1]
                      },
                      "properties": {
                        "title": "End",
                        "icon": "embassy"
                      }
                    }
                  ]
                };

                const viewSize = {
                  width: 400,
                  height: 400
                };

                const width = 600;
                const height = 600;

                const zoomAdd = (width - viewSize.width) / viewSize.width;

                const center = map.getCenter();
                const zoom = map.getZoom() + 0.5;


                const encodedGeoJSON = encodeURIComponent(JSON.stringify(geoJSON));

                const url = 'https://api.mapbox.com/styles/v1/maurice-conrad/cjx99d5vc2gyb1dmmu184s2u0/static/geojson(' + encodedGeoJSON + ')/' + center.lng + ',' + center.lat + ',' + zoom + '/' + width + 'x' + height + '@2x?access_token=' + mapboxgl.accessToken;

                callback(url);
              }
            }
          ],
          childs: [
            PicCreator.createElement("img", {
              className: "btn-icon",
              attributes: {
                src: "icons/refresh.svg"
              }
            })
          ]
        })
      ]
    });


    setTimeout(function() {

      map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v9',
        center: [field.properties.center.longitude, field.properties.center.latitude],
        zoom: 13.5
      });

      map.getCanvas().style.cursor = 'crosshair';

      map.on('click', function(e) {


        /*route.push({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat
        });*/
        route.push([
          e.lngLat.lng,
          e.lngLat.lat
        ]);

        updateRoute();

      });




      map.on("load", function() {

        map.addSource('route', {
          type: 'geojson',
          data: routeData
        });

        map.addLayer({
          "id": "route",
          "type": "line",
          "source": "route",
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": "#1DA64A",
            "line-opacity": 1,
            "line-width": 5
          }
        });


        map.addSource('points', {
          "type": "geojson",
          "data": pointsData
        });

        map.addLayer({
          "id": "points",
          "type": "symbol",
          "source": 'points',
          "layout": {
            "icon-image": "{icon}-15",
            "text-field": "{title}",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0, 0.6],
            "text-anchor": "top"
          }
        });




      });
    }, 100);

    return [
      PicCreator.createElement("div", {
        className: "map-container",
        childs: [
          mapContainer,
          btns
        ]
      })
    ];
  }
};

const Export = [
  {
    name: "PNG (Server)",
    experimental: true,
    clientSide: false,
    convert(svg, templateUrl, data) {

      return new Promise(async (resolve, reject) => {

        const apiUrl = "https://api.lautfuersklima.de/proxy?http://195.201.36.188:65323/api/render?" + templateUrl;
        console.log(apiUrl);

        fetch(apiUrl, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data._data)
        }).then(async response => {
          const blob = await response.blob();

          const blobUrl = URL.createObjectURL(blob);

          resolve(blobUrl);
        });

        //resolve(await Export[1].convert(svg))

      });
    }
  },
  {
    name: "PNG",
    clientSide: true,
    convert(svg) {
      return new Promise(function(resolve, reject) {
        const viewBox = svg.getAttribute("viewBox").split(" ").map(numberStr => parseInt(numberStr));

        var c = document.getElementById("render-canvas");

        c.width = viewBox[2];
        c.height = viewBox[3];
        var ctx = c.getContext("2d");

        //const img = document.createElement("img");
        //const img = document.getElementById("draw-img");
        const img = new Image();

        //img.width = c.width;
        //img.height = c.height;

        img.src = 'data:image/svg+xml;base64,' + Base64.encode(svg.outerHTML);
        //window.open(img.src);
        const loadScreen = document.querySelector(".load-screen");

        img.addEventListener("load", function() {
          ctx.drawImage(img, 0, 0);

          const dataURL = c.toDataURL("image/png");

          resolve(dataURL);

          //loadScreen.classList.add("show");


          /*setTimeout(function() {
            const dataURL = c.toDataURL("image/png");

            resolve(dataURL);

            loadScreen.classList.remove("show");
          }, 1000);*/
        });
      });
    }
  },
  {
    name: "SVG",
    clientSide: true,
    convert(svg) {
      return new Promise(function(resolve, reject) {
        const dataURL = 'data:image/svg+xml;base64,' + Base64.encode(svg.outerHTML);

        resolve(dataURL);
      });
    }
  }
];

Vue.component('multiline-text', {
  props: ['x', 'y', 'text', 'padding', 'lineheight', 'background', 'css', 'verticalalign', 'align'],
  data: function() {
    return {
      a: 100
    };
  },
  computed: {
    pos() {
      return {
        x: Number(this.x),
        y: Number(this.y)
      };
    },
    offset() {
      const padding = this.padding.split(" ").map(Number);
      return [
        padding[0],
        padding[1] || padding[0],
        padding[2] || padding[0],
        padding[3] || padding[1] || padding[0]
      ];
    },
    computedStyle() {
      const testElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
      testElement.style = this.css;
      return testElement.style;
    },
    styleObj() {
      const computedStyle = this.computedStyle;

      const obj = {};
      for (let key in computedStyle) {
        if (computedStyle.hasOwnProperty(key)) {
          const value = computedStyle[key];
          if (key.match(/[^0-9]/) && value) {
            obj[key] = value;
          }
        }
      }
      return obj;
    },
    fontSize() {
      return Number(this.computedStyle["font-size"].replace(/[^0-9]/g, ""));
    },
    lines() {

      const viewBox = this.$root.$el.closest("svg").getAttribute("viewBox").split(" ").map(numberStr => parseInt(numberStr));

      const verticalAlign = this["verticalalign"];
      const align = this["align"];

      const rectHeight = this.offset[0] + (this.fontSize * 1) + this.offset[2];

      const totalRectSize = {
        width: this.offset[3] + PicCreator.textInfo(this.text.sort((a, b) => {
          return a.length < b.length ? 1 : -1;
        })[0], this.styleObj).width + this.offset[1],
        height: rectHeight
      };

      const x = align == "right" ? (viewBox[2] - Number(this.x) - totalRectSize.width) : Number(this.x);
      const y = (viewBox[3] + Number(this.y)) % viewBox[3];

      const lineHeight = Number(this.lineheight || 1.1);



      const totalHeight = (rectHeight * lineHeight) * this.text.length;


      return this.text.map((line, index) => {

        const rectSize = {
          width: this.offset[3] + PicCreator.textInfo(line, this.styleObj).width + this.offset[1],
          height: rectHeight
        };

        const yPos = y + (rectSize.height * lineHeight) * index;



        return {
          text: line,
          x: x,
          y: verticalAlign == "center" ? (yPos - totalHeight / 2) : (Number(this.y) >= 0 ? yPos : (yPos - totalHeight)),
          //y: (yPos - totalHeight * (Number(this.y) < 0)),
          width: rectSize.width,
          height: rectSize.height
        };
      });
    }
  },
  created() {

  },
  template: `
    <g>
      <g v-for="line in lines" v-bind:style="styleObj">
        <rect v-bind:x="line.x" v-bind:y="line.y" v-bind:height="line.height" v-bind:width="line.width" v-bind:style="{ fill: background }" />
        <text v-bind:x="line.x + offset[3]" v-bind:y="line.y + offset[0]" style="alignment-baseline: hanging;">
          {{ line.text }}
        </text>
      </g>
    </g>
  `
})


function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
}


// Create Base64 Object
const Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}


function getElementByMethod(e, handler) {
  const results = [];
  function loop(e) {
    for (let child of e.children) {
      if (handler(child)) {
        results.push(child);
      }
      loop(child);
    }
  }
  loop(e);
  return results;
}

function Uint8ToBase64(u8Arr){
  var CHUNK_SIZE = 0x8000; //arbitrary number
  var index = 0;
  var length = u8Arr.length;
  var result = '';
  var slice;
  while (index < length) {
    slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
    result += String.fromCharCode.apply(null, slice);
    index += CHUNK_SIZE;
  }
  return btoa(result);
}

function parseHeaders(headersStr) {
  const headers = {};
  for (let headerLine of headersStr.split("\n")) {
    const lineMatch = headerLine.match(/([^\:]*):\s{0,}(.*)/);
    if (lineMatch) {
      headers[lineMatch[1]] = lineMatch[2];
    }
  }
  return headers;
}


function parsePathData(dataStr) {
  const stepMatches = matchAll(dataStr, /[a-z]/i);

  const points = new Array().concat(...stepMatches.map((stepMatch, i) => {
    const stepChar = stepMatch[0];
    const stepStr = dataStr.substring(stepMatch.index + 1, ((i + 1) in stepMatches ? stepMatches[i + 1].index : dataStr.length));

    const points = stepStr.split(" ").map(point => {
      const pointParts = point.split(",").map(Number);
      return {
        x: pointParts[0],
        y: pointParts[1]
      };
    }).filter(point => point.x != undefined && point.y != undefined);

    return points;
  }));


  return 100;
}

function matchAll(str, rgx) {
  var arr, extras, matches = [];
  str.replace(rgx.global ? rgx : new RegExp(rgx.source, (rgx + '').replace(/[\s\S]+\//g , 'g')), function(i) {
    matches.push(arr = [].slice.call(arguments));
    extras = arr.splice(-2);
    arr.index = extras[0];
    arr.input = extras[1];
  });
  return matches[0] ? matches : null;
}



function wordWrap(str, maxWidth) {
  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
};


    var newLineStr = "\n"; done = false; res = '';
    do {
        found = false;
        // Inserts new line at first whitespace of the line
        for (i = maxWidth - 1; i >= 0; i--) {
            if (testWhite(str.charAt(i))) {
                res = res + [str.slice(0, i), newLineStr].join('');
                str = str.slice(i + 1);
                found = true;
                break;
            }
        }
        // Inserts new line at maxWidth position, the word is too long to wrap
        if (!found) {
            res += [str.slice(0, maxWidth), newLineStr].join('');
            str = str.slice(maxWidth);
        }

        if (str.length < maxWidth)
            done = true;
    } while (!done);

    return res + str;
}
