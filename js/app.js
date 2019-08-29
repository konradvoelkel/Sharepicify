//const app = new PicCreator('.app', PicCreator.templates["fff"]);

//console.log(app);


const hash = window.location.hash.substring(1);
var svgViewController;

const instances = {
  de: {
    icon: "icons/germany.svg",
    templates: [
      "sharepic/templates/date-2/template.json",
      "sharepic/templates/fff/template.json",
      "sharepic/templates/quote/template.json",
      "sharepic/templates/info/template.json",
      "sharepic/templates/checklist/template.json",
      "sharepic/templates/pride/template.json",
      "sharepic/templates/countdown/template.json",
      "sharepic/templates/map/template.json",
      "sharepic/templates/letter/template.json",
      "sharepic/templates/influence/template.json",
      "sharepic/templates/imperative/template.json",
      "sharepic/templates/date/template.json",
      "sharepic/templates/sentence/template.json",
      "sharepic/templates/logo/template.json",
      "sharepic/templates/s4f-logo/template.json"
    ]
  },
  en: {
    icon: "icons/united-kingdom.svg",
    templates: [
      "sharepic/templates/influence/template.json"
    ]
  },
  get default() {
    return Object.assign(this.de, {
      hidden: true
    });
  }
};


const footerApp = new Vue({
  el: 'footer',
  data: {
    instances: Object.keys(instances).map(instanceKey => {
      return Object.assign({
        key: instanceKey,
        active: hash == "" ? (instanceKey == "de") : (instanceKey == hash)
      }, instances[instanceKey]);
    }).filter(instance => !instance.hidden)
  }
});
window.addEventListener("hashchange", function(event) {
  window.location.reload();
});

const templateUrls = instances[hash || "default"].templates;

const startIndex = 0;

(() => {

  const templates = [];
  const templatePromises = templateUrls.map(get);

  for (let templateRaw of templatePromises) {
    (async () => {
      const template = JSON.parse(await templateRaw);
      templates.push(template);

      console.log("!");

      const index = templatePromises.indexOf(templateRaw);

      if (index == startIndex) {
        svgViewController = new PicCreator('.app', template, exportController.render);
      }
    })();
  }

  const nav = new Vue({
    el: '.navigation',
    data: {
      show: true,
      selected: 0,
      templates: templates
    },
    methods: {
      selectTemplate(event) {
        const templateItem = event.target.closest("li");
        const templateIndex = Array.from(templateItem.parentNode.children).indexOf(templateItem);

        this.selected = templateIndex;

        svgViewController = new PicCreator('.app', this.templates[this.selected], exportController.render);
      }
    }
  });

  // Get an array of the raw template files (unparsed JSON)
  /*const templatesAnswerRaw = await Promise.all(templateUrls.map(get));

  console.log(templatesAnswerRaw);
  // Parse the unparsed template files
  const templates = templatesAnswerRaw.map(JSON.parse);

  // Get an array of the raw template documents
  const docsAnswerRaw = await Promise.all(templates.map(template => get(template.document)));


  const nav = new Vue({
    el: '.navigation',
    data: {
      show: true,
      selected: 0,
      templates: templates
    },
    methods: {
      selectTemplate(event) {
        const templateItem = event.target.closest("li");
        const templateIndex = Array.from(templateItem.parentNode.children).indexOf(templateItem);

        this.selected = templateIndex;

        svgViewController = new PicCreator('.app', this.templates[this.selected], exportController.render);
      }
    }
  });

  svgViewController = new PicCreator('.app', nav.templates[nav.selected], exportController.render);*/



})();

const exportController = new Vue({
  el: '.export',
  data: {
    show: false,
    src: 'http://lokalo.de/wp-content/uploads/2019/01/fridayforfuture_trier.jpg'
  },
  methods: {
    close() {
      this.show = false;
    },
    render(dataURL) {
      console.log(dataURL.length);

      this.show = true;


      this.src = dataURL;
    }
  }
});




function get(url) {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.addEventListener("load", function() {
      resolve(this.response);
    });
    xhr.send();
  });
}


String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
