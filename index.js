module.exports = {
  /**
   * Render the text layer for a page in the PDF Document
   *
   * @param {Object} options The options for rendering
   *    options:
   *      - container   The DIV element to render text to
   *      - pageNumber  The page number in the PDF Document
   *      - viewport    The PDFPage.getViewport data
   *      - textContent The PDFPage.getTextContent data
   * @return void
   */
  render: function (options) {
    var textLayerFactory = new PDFJS.DefaultTextLayerFactory();
    var textLayerBuilder = textLayerFactory.createTextLayerBuilder(options.container, options.pageNumber - 1, options.viewport);
    textLayerBuilder.setTextContent(options.textContent);
    textLayerBuilder.render();

    setTimeout(function () {
      mergeAdjacentText(options.container);
    });
  }
};

/**
 * Characters in text layer may be rendered character by character.
 * This causes weirdness when selecting text to create annotations.
 * This method merges adjacent characters into a shared div.
 *
 * @param textLayer <div> containing the text content
 */
function mergeAdjacentText(textLayer) {
  var chars = textLayer.querySelectorAll('div');
  var rows = {};

  // Arrange all the characters by row based on style.top
  Array.prototype.forEach.call(chars, function (div) {
    var top = div.style.top;

    if (!rows[top]) {
      rows[top] = [];
    }

    var row = rows[top];
    row.push(div);
  });

  // Merge characters into rows
  var fragment = document.createDocumentFragment();
  Object.keys(rows).forEach(function (key) {
    var row = rows[key];
    var text = '';
    var textDiv;
    var lastDiv;

    function openTextDiv(div) {
      textDiv = div.cloneNode();
      textDiv.innerHTML = '';
      fragment.appendChild(textDiv);
    }

    function closeTextDiv() {
      textDiv.appendChild(document.createTextNode(text));
      textDiv = null;
      text = '';
    }

    // Iterate every character in the row
    row.forEach(function (div, i) {
      if (!textDiv) {
        openTextDiv(div);
      }

      // Get the style without position props of this and last div
      var thisStyle = div.getAttribute('style');
      var lastStyle = lastDiv ? lastDiv.getAttribute('style') : null;
      if (thisStyle) {
        thisStyle = thisStyle.replace(/(left|top):.*?px;/g, '').trim();
      }
      if (lastStyle) {
        lastStyle = lastStyle.replace(/(left|top):.*?px;/g, '').trim();
      }

      // Close div if last style doesn't match current style
      if (thisStyle !== lastStyle) {
        closeTextDiv();
        openTextDiv(div);
      }
      // Account for white space-ish
      else if (lastDiv) {
        var thisRect = div.getBoundingClientRect();
        var lastRect = lastDiv.getBoundingClientRect();
        var cloneDiv = div.cloneNode();
        var spaceDiff = thisRect.left - lastRect.right;
        var spaceWidth = 0;

        // Calculate the width of a single white space
        cloneDiv.innerHTML = '&nbsp;';
        cloneDiv.style.position = 'absolute';
        document.body.appendChild(cloneDiv);
        spaceWidth = cloneDiv.getBoundingClientRect().width;
        document.body.removeChild(cloneDiv);

        // If the diff is greater than a single space close div
        if (spaceDiff > spaceWidth) {
          closeTextDiv();
          openTextDiv(div);
        }
        // Otherwise if divs aren't immediately adjacent add a space
        else if (spaceDiff >= 1) {
          text += ' ';
        }
      }
      
      // Copy text content
      text += div.textContent;

      // This is it, we're done with the row
      if (i === row.length - 1) {
        closeTextDiv();
      }

      // Keep track of the last div
      lastDiv = div;
    });
  });

  // Update the text layer with the merged text
  textLayer.innerHTML = '';
  textLayer.appendChild(fragment);
}
