import "./styles.css";

// TODO:
// * Add text component
//  * Need to be able to edit these again after adding
//  * Add font-size changing with number keys like arrows
// * Consider making the markers classes so you don't have conditional
//   logic strewn everywhere...
// * Add bigger invisible markers for selecting
// * Add handles for box?
//   * Normally there are a bunch of these, you can resize from every corner
//     and resize only height or width from either side, plus rotation handle,
//     not sure if I care about supporting all of that...
const XMLNS = "http://www.w3.org/2000/svg";

function rads2degs(radians) {
  return radians * (180 / Math.PI);
}

// App state, might be better to make this an object
let currentColor = "red";
let mode = "select";
let selectedMarker;
let svgBoundingRect;

function clearSelection() {
  if (selectedMarker) {
    selectedMarker.handleDeselect();
    selectedMarker = null;
  }
}

function selectMarker(marker) {
  clearSelection();
  selectedMarker = marker;
  selectedMarker.handleSelect();
}

class Text {
  constructor(text, svg, x, y) {
    this.text = text;
    this.svg = svg;
    this.div = document.createElement("div");
    this.div.setAttribute("contenteditable", true);
    this.div.style.position = "absolute";
    this.div.style.top = y + "px";
    this.div.style.left = x + "px";
    this.div.innerHTML = text;
    this.div.style.color = currentColor;
    this.addTextContainer();
    this.textContainer.appendChild(this.div);
    this.textContainer.addEventListener("mousedown", (e) => {
      if (e.target === this.textContainer) {
        this.removeTextContainer();
      }
    });
    // Because text gets added to a prelimary div first so we can use
    // contenteditable to edit it, we need to switch to another mode prior to
    // adding the text to the svg.
    mode = "editText";
  }

  handleSelect() {
    this.svgText.setAttribute("fill", "blue");
  }

  handleDeselect() {
    this.svgText.setAttribute("fill", currentColor);
  }

  // TODO: Maybe this is unnecessary since we basically just
  // clear selection and remove the item? But maybe it's more complicated
  // for something like the arrow...
  handleDelete() {}

  handleKeys(e) {
    let m = this.svgText;
    if (e.key === "x") {
      clearSelection();
      m.parentElement.removeChild(m);
    } else if (e.key === "1") {
      m.setAttribute("font-size", 14);
    } else if (e.key === "2") {
      m.setAttribute("font-size", 16);
    } else if (e.key === "3") {
      m.setAttribute("font-size", 18);
    } else if (e.key === "4") {
      m.setAttribute("font-size", 24);
    } else if (e.key === "5") {
      m.setAttribute("font-size", 48);
    }
  }

  // TODO: These '*TextContainer' method names are horrible
  addTextContainer() {
    // TODO: Should the text-container be a Singleton?
    this.textContainer = document.createElement("div");
    this.textContainer.setAttribute("id", "text-container");
    this.textContainer.style.width = this.svg.clientWidth + "px";
    this.textContainer.style.height = this.svg.clientHeight + "px";
    this.textContainer.classList.add("annotater");
    this.svg.parentElement.appendChild(this.textContainer);
  }

  removeTextContainer() {
    // TODO: This probably needs to be calculated from the font-size, or from the baseline...
    // The difference here is the textDiv gets its y coordinate from the upper left, but when
    // you set the y coordinate of svg you're setting the text baseline, so you have to
    // account for the height of the text...
    const TEXT_SHIFT_AMOUNT = 14;
    this.svgText = document.createElementNS(XMLNS, "text");
    this.svgText.textContent = this.div.textContent;
    this.svgText.setAttribute("x", parseInt(this.div.style.left, 10));
    this.svgText.setAttribute(
      "y",
      parseInt(this.div.style.top, 10) + TEXT_SHIFT_AMOUNT
    );
    this.svgText.setAttribute("fill", currentColor);
    this.svgText.classList.add("marker");
    this.svgText.classList.add("marker");
    this.svg.appendChild(this.svgText);
    this.textContainer.parentElement.removeChild(this.textContainer);

    // Put a reference to this class object on the text node so when it gets
    // clicked we can reference things on it...
    this.svgText.__instance = this;
    // TODO: Not great that we're modifying a global mode this way...
    mode = "select";
  }
}

class Arrow {
  constructor(svg, x, y) {
    this.svg = svg;
    let endX = x + 1;
    let endY = y + 1;
    this.line = document.createElementNS(XMLNS, "line");
    this.line.setAttribute("x1", x);
    this.line.setAttribute("y1", y);
    this.line.setAttribute("x2", endX);
    this.line.setAttribute("y2", endY);
    this.line.setAttribute("stroke-width", "3");
    this.line.setAttribute("stroke", currentColor);
    this.line.setAttribute("fill", currentColor);
    this.line.classList.add("marker");

    this.arrowHead = document.createElementNS(XMLNS, "polygon");
    this.arrowHead.setAttribute(
      "points",
      `${endX},${endY}, ${endX - 5},${endY - 5}, ${endX + 5},${endY - 5}`
    );
    this.arrowHead.setAttribute("stroke-width", "3");
    this.arrowHead.setAttribute("fill", currentColor);
    this.arrowHead.setAttribute("stroke", currentColor);
    this.arrowHead.classList.add("marker");

    this.moveListener = (e) => {
      const currentX = e.clientX - svgBoundingRect.left;
      const currentY = e.clientY - svgBoundingRect.top;

      this.line.setAttribute("x2", currentX);
      this.line.setAttribute("y2", currentY);
      // Calculate arrow rotation
      // We can do this using simple trig
      // tan(theta) = opp / adj;
      // tan(theta) = (y1 - y2) / (x1 - x2);
      // theta = arctan((y1 - y2) / (x1 - x2))
      // This answer is in radians, so convert to degrees
      // We subtract 90 because we draw the arrow head top
      // to bottom, we could avoid this if we drew it left
      // to right
      const rotation = rads2degs(Math.atan2(y - currentY, x - currentX)) - 90;
      this.arrowHead.setAttribute(
        "points",
        `${currentX},${currentY}, ${currentX - 3},${currentY + 5}, ${
          currentX + 3
        },${currentY + 5}`
      );
      this.arrowHead.setAttribute(
        "transform",
        `rotate(${rotation}, ${currentX}, ${currentY})`
      ); // Do I need to calculate center of triangle?
    };

    document.addEventListener("mousemove", this.moveListener);
    document.addEventListener("mouseup", () => {
      if (this.moveListener) {
        document.removeEventListener("mousemove", this.moveListener);
        selectMarker(this);
        mode = "select";
        this.moveListener = null;
      }
    });

    this.line.__instance = this;
    this.arrowHead.__instance = this;

    this.svg.appendChild(this.line);
    this.svg.appendChild(this.arrowHead);
  }

  handleSelect() {
    this.line.setAttribute("stroke", "blue");
    this.arrowHead.setAttribute("stroke", "blue");
    this.addArrowEditors();
  }

  handleDeselect() {
    this.line.setAttribute("stroke", currentColor);
    this.arrowHead.setAttribute("stroke", currentColor);
    this.removeArrowEditors();
  }

  handleKeys(e) {
    if (e.key === "x") {
      clearSelection();
      this.line.parentElement.removeChild(this.line);
      this.arrowHead.parentElement.removeChild(this.arrowHead);
    } else if (e.key === "1") {
      this.line.setAttribute("stroke-width", 3);
      this.arrowHead.setAttribute("stroke-width", 5);
    } else if (e.key === "2") {
      this.line.setAttribute("stroke-width", 5);
      this.arrowHead.setAttribute("stroke-width", 5);
    } else if (e.key === "3") {
      this.line.setAttribute("stroke-width", 8);
      this.arrowHead.setAttribute("stroke-width", 8);
    } else if (e.key === "4") {
      this.line.setAttribute("stroke-width", 12);
      this.arrowHead.setAttribute("stroke-width", 12);
    } else if (e.key === "5") {
      this.line.setAttribute("stroke-width", 15);
      this.arrowHead.setAttribute("stroke-width", 15);
    }
  }

  addArrowEditors() {
    const startX = this.line.getAttribute("x1");
    const startY = this.line.getAttribute("y1");
    const endX = this.line.getAttribute("x2");
    const endY = this.line.getAttribute("y2");

    // TODO: Could probably make these specific handles that we can reference and remove
    // directly vs. generic
    this.addHandle(startX, startY, "x1", "y1");
    this.addHandle(endX, endY, "x2", "y2");
  }

  removeArrowEditors() {
    // TODO: Could probably specifically remove these vs. removing everything
    document
      .querySelectorAll("svg .marker-editor-handle")
      .forEach((node) => node.parentElement.removeChild(node));
  }

  addHandle(startX, startY, xAttr, yAttr) {
    const handle = document.createElementNS(XMLNS, "circle");
    handle.setAttribute("cx", startX);
    handle.setAttribute("cy", startY);
    handle.setAttribute("r", 6);
    handle.setAttribute("fill", "grey");
    handle.setAttribute("stroke", "black");
    handle.setAttribute("opaciy", 0.5);
    handle.classList.add("marker-editor-handle");
    this.svg.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const moveListener = (e) => {
        const currentX = e.clientX - svgBoundingRect.left;
        const currentY = e.clientY - svgBoundingRect.top;

        this.line.setAttribute(xAttr, currentX);
        this.line.setAttribute(yAttr, currentY);
        handle.setAttribute("cx", currentX);
        handle.setAttribute("cy", currentY);

        if (xAttr === "x2") {
          this.arrowHead.setAttribute(
            "points",
            `${currentX},${currentY}, ${currentX - 3},${currentY + 5}, ${
              currentX + 3
            },${currentY + 5}`
          );
        }
        this.updateArrowHead();
      };

      sourceContainer.addEventListener("mousemove", moveListener);
      handle.__moveListener = moveListener;
    });

    handle.addEventListener("mouseup", () => {
      if (handle.__moveListener) {
        sourceContainer.removeEventListener("mousemove", handle.__moveListener);
        handle.__moveListener = null;
      }
      // TODO: Probably need to remove the mouseup listener here too?
    });
  }

  updateArrowHead() {
    let x1 = this.line.getAttribute("x1");
    let x2 = this.line.getAttribute("x2");
    let y1 = this.line.getAttribute("y1");
    let y2 = this.line.getAttribute("y2");

    const rotation = rads2degs(Math.atan2(y1 - y2, x1 - x2)) - 90; // TODO: This -90 is dumb just draw the arrowhead pointing the right...
    this.arrowHead.setAttribute(
      "transform",
      `rotate(${rotation}, ${x2}, ${y2})`
    );
  }
}

class Box {
  constructor(svg, x, y) {
    this.rect = document.createElementNS(XMLNS, "rect");
    this.rect.setAttribute("x", x);
    this.rect.setAttribute("y", y);
    this.rect.setAttribute("width", 1);
    this.rect.setAttribute("height", 1);
    this.rect.setAttribute("stroke-width", "3");
    this.rect.setAttribute("fill", "none");
    //   let w = currentX - startX;
    //   let newX = startX;
    //   if (w < 0) {
    //     w *= -1;
    //     newX = currentX;
    //   }
    //   let h = currentY - startY;
    //   let newY = startY;
    //   if (h < 0) {
    //     h *= -1;
    //     newY = currentY;
    //   }
    //   marker.setAttribute("x", newX);
    //   marker.setAttribute("y", newY);
    //   marker.setAttribute("width", w);
    //   marker.setAttribute("height", h);
  }
}

function initAnnotater(image) {
  const svg = document.createElementNS(XMLNS, "svg");
  svg.setAttribute("xmlns", XMLNS);
  svg.setAttribute("version", "1.1");
  svg.setAttribute("width", image.clientWidth);
  svg.setAttribute("height", image.clientHeight);
  svg.classList.add("annotater");
  image.parentElement.appendChild(svg);
  // TODO: You might later need to take care to update this...
  svgBoundingRect = svg.getBoundingClientRect();

  const clear = document.getElementById("clear");

  clear.addEventListener("click", () => {
    document
      .querySelectorAll("svg .marker, svg .marker-editor-handle")
      .forEach((node) => node.parentElement.removeChild(node));
  });

  document.addEventListener("keyup", (e) => {
    if (mode === "editText") {
      // If we're in editText mode, then don't pay attention to most
      // key presses because we're typing text in and don't want to be
      // switching modes or things like that in the middle...
      // TODO: Maybe we should allow ESC to stop editing here...
      return;
    }

    if (e.key === "a") {
      clearSelection();
      mode = "arrow";
    } else if (e.key === "b") {
      clearSelection();
      mode = "box";
    } else if (e.key === "t") {
      clearSelection();
      mode = "text";
    }

    if (selectedMarker) {
      selectedMarker.handleKeys(e);
    }
  });

  sourceContainer.addEventListener("mousedown", (e) => {
    // If you're dragging and you move the mouse outside the document and
    // release, we'll miss that event, so we always check on a mouse down if
    // there's something that's currently selected and clear it so that we don't
    // end up with multiple markers moving around etc...
    if (selectedMarker) {
      clearSelection();
    }

    if (e.target.classList.contains("marker")) {
      selectMarker(e.target.__instance);
    }

    const x = e.clientX - svgBoundingRect.left;
    const y = e.clientY - svgBoundingRect.top;

    if (mode === "box") {
      new Box(svg, x, y);
    } else if (mode === "arrow") {
      new Arrow(svg, x, y);
    } else if (mode === "text") {
      new Text("Hello", svg, x, y);
    }
  });

  // Elements for rendering
  const render = document.getElementById("render");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const targetImage = document.querySelector("#render-container img");

  // Rendering logic
  render.addEventListener("click", () => {
    const svgData = svg.outerHTML;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const img = new Image(canvas.width, canvas.height);
    img.setAttribute("crossOrigin", "anonymous");

    const blob = new Blob([svgData], { type: "image/svg+xml" });

    const DOMURL = window.URL;
    const url = DOMURL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, image.naturalWidth, image.naturalHeight);
      DOMURL.revokeObjectURL(url);

      const result = canvas.toDataURL("image/png", 1);
      targetImage.width = image.width;
      targetImage.src = result;
    };

    img.src = url;
  });
}

const sourceContainer = document.getElementById("source-container");
const img = sourceContainer.querySelector("img");
// img.crossOrigin = "anonymous";
// For some reason this didn't always fire...
//img.addEventListener("load", function () {
//initAnnotater(this);
//});

initAnnotater(img);
