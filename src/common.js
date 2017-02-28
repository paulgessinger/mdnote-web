var MarkdownIt = require('markdown-it');
var md = new MarkdownIt();
md.use(require('markdown-it-katex'));
md.use(require('markdown-it-task-lists'));
md.use(require('markdown-it-highlightjs'));


async function renderMarkdownFile(file) {
  try {
    var fs = require("fs-promise");
    if(!await fs.exists(file)) return "";
    const mdcontent = await fs.readFile(file, "utf-8");
    const html = renderMarkdown(mdcontent);
    return html;
  }
  catch(e) {
    console.error("Error rendering md file", file, e);
  }
}

function renderMarkdown(mdcontent) {
  var html = md.render(mdcontent);
  html = html.replace(/<img.+src="(.+?)\.pdf".+>/g, (m, s) => {
    const pdf = s+".pdf";
    //const size = getPdfSize(pdf);
    //var ratio = Math.round(size.y/size.x*10000.)/100;
    //ratio += 3.;
    var ratio = 70.;
    const embed = `<div class="pdf-embed"><span style="padding-bottom:${ratio}%;"></span><object type="application/pdf" width="100%" height="100%" data="${pdf}"></object></div>`
    return embed;
  });
  return html;
}

module.exports = {
  renderMarkdownFile,
  renderMarkdown
};
