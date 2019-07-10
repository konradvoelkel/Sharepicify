# Sharepicify

## Templates erstellen

**Wichtig:** Die Templates greifen über [Vue.js](https://vuejs.org) auf einen Datensatz zu. Um also das SVG Template mit dynamischen Variablen zu besetzen, kann auf jede Art der Vue.js Syntax zurückgegriffen werden.

### Template.json

In der `template.json` Datei wir ddas Template beschrieben. Dort finden sich selbsterklärende Infos sowie das Array `fields`.
In `fields` werden alle Steuerlemente festgelegt und einem `key` für den Datensatz bzw. die Vue-Instanz zugeordnet, den sie manipulieren.

In folgendem Beispiel sind dire Steuerlemente definiert. Ein manuelle Auswahl (`selection`), ein Textfeld (`text`), dass ein Array aus Zeilen ausgibt, ein einzeiliges Input-Feld (`line`), dass nur einen String ausgibt. Das erste Element manipuliert die Variable `title` innerhalb der Vue-Instanz. Das zweite verändert die Variable `subtitle`. Auf beide kann dann innerhalb des SVG Templates über Vue.js zugegriffen werden.

```json
{
  "name": "Sentence",
  "preview": "sharepic/templates/sentence/preview.jpg",
  "document": "sharepic/templates/sentence/document.svg",
  "fonts": [
    {
      "name": "Jost",
      "src": "fonts/jost.ttf",
      "mime": "font/truetype"
    },
    {
      "name": "Jost-900-Black",
      "src": "fonts/Jost-900-Black.ttf",
      "mime": "font/truetype"
    },
    {
      "name": "Merriweather",
      "src": "fonts/Merriweather-Light.otf",
      "mime": "font/opentype"
    }
  ],
  "fields": [
    {
      "type": "selection",
      "description": "Background",
      "key": "backgroundImage",
      "default": {
        "value": "sharepic/templates/fff/default.jpg"
      },
      "properties": {
        "items": [
          {
            "type": "value",
            "value": "#1DA64A",
            "render": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxREE2NEEiLz48L3N2Zz4="
          },
          {
            "type": "value",
            "value": "#1B7340",
            "render": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxQjczNDAiLz48L3N2Zz4="
          },
          {
            "type": "file"
          }
        ]
      }
    },
    {
      "type": "text",
      "description": "Title",
      "key": "title",
      "default": ["WORLD", "WHALE", "DAY"],
      "properties": {

      }
    },
    {
      "type": "line",
      "description": "Subtitle",
      "key": "subtitle",
      "default": "TODAYS IS",
      "properties": {

      }
    }
  ]
}
```

Es gibt eine Menge an verschiedenen Steuerlementen. Ein Steuerlement wird über den `type` angesprochen. Jedes Steuerelement ist vorprogrammiert und gibt einen bestimmten Output aus. "Ausgegeben" wird das dann indem die im `key` beschriebene Variable innerhalb des Vue.js-Datensatzes manipuliert wird.

In `default` wird der Default-Wert festgelegt und `properties` enthält individuelle Eigenschaften des Steuerlementes. Im Fall von `text` und `line` gibt es keine weiteren Eigenschaften, bei anderen Elementen sieht das aber anders aus.

### Types

|Type|Output|
|--------
|`text`|Array aus Strings|
|`dynamic-text`|Array aus Strings welches Text dynamisch in verschiedene Verhältnisse presst (dynamische Zeilenumbrüche)|
|`line`|String|
|`number`|Number|
|`selection`|Manuellen Wert des selektierten Elementes|

Dazu einfach einen Blick auf das obige Beipspiel werfen. Alle Steuerlemente sind eigentlich recht selbsterklärend. Lediglich bei `selection` ist es wichtig, dass es außerhalb des klassischen Item-Types `value`, die einen manuellen Wert zurückgibt noch den besonderen Typen `file` gibt. Das ist lediglich ein Datei/Bild-Upload, der ein *Image-Description-Object* ausgibt. Ein solches *Image-Description-Object* sieht wie folgt aus:

```json
{
  "value": "data:image/mime;base64,......."
}
```

### SVG Template

Die Vue-Instanz liegt **innerhalb** der `.main` Group. Das hat den Hintergund, dass oberhalb dieser Gruppe noch die in der `template.json` Datei definierten Schriften als Data-URLs eingebunden werden und dass innerhalb von Vue.js zu Fehlern führen würde.

```html
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"

     viewBox="0 0 1200 1200"
     version="1.1">


  <g class="main">


    <image v-if="typeof backgroundImage == 'object'" v-bind:xlink:href="backgroundImage.value" v-bind:x="(backgroundImage.info.ratio >= 1 ? -((backgroundImage.info.ratio - 1) * pos) : 0) + '%'" v-bind:y="(backgroundImage.info.ratio < 1 ? -(((1 / backgroundImage.info.ratio) - 1) * pos) : 0) + '%'" v-bind:height="(backgroundImage.info.ratio < 1 ? ((1 / backgroundImage.info.ratio) * 100) : 100) + '%'" v-bind:width="(backgroundImage.info.ratio >= 1 ? (backgroundImage.info.ratio * 100) : 100) + '%'" />
    <rect x="0" y="0" width="100%" height="100%" v-bind:fill="backgroundImage" v-if="typeof backgroundImage != 'object'"/>

    <rect x="0" y="0" width="100%" height="100%" fill="#1DA64A" v-bind:fill-opacity="0" />

    <g v-for="line in title">

      <rect x="50" v-bind:y="50 + 190 * (title.indexOf(line) + 0)" v-bind:height="textInfo(line.toUpperCase(), { fontFamily: 'Jost', fontSize: '150px' }).height - 50" v-bind:fill="textBg" v-bind:width="textInfo(line.toUpperCase(), { fontFamily: 'Jost', fontSize: '150px'}).width + 40" v-bind:fill-opacity="opacity"/>


      <text alignment-baseline="middle" x="70" fill="#fff" v-bind:y="22.5 + 130 + 190 * (title.indexOf(line) + 0)" style="font-size: 150px; font-family: 'Jost', 'Helvetica Neue';">
        {{ line }}
      </text>

    </g>

    <text x="80" fill="#fff" v-bind:y="(145 + 180 * title.length) + 85 * subtitle.indexOf(line)" style="font-size: 85px; font-family: 'Helvetica Neue'; text-shadow: 0px 0px 7px rgba(0, 0, 0, 1);" v-for="line in subtitle">
      {{ line }}
    </text>

    <image v-bind:xlink:href="logo" x="930" y="930" height="250" width="250" />

  </g>


</svg>

```

### Vue-Directives

Damit gewisse grafisch/mathematische Zusammenhänge funktionieren, werden teilweise sehr komplexe JavaScript-Ausdrücke benötigt. Ein Bild, dass sich mit einem `pos` Parameter im `cover`-Stil von CSS-Background-Images bewegen lässt, würde z.B. folgenden Ausdruck benötigen:

```html
<image v-if="typeof backgroundImage == 'object'" v-bind:xlink:href="backgroundImage.value" v-bind:x="(backgroundImage.info.ratio >= 1 ? -((backgroundImage.info.ratio - 1) * pos) : 0) + '%'" v-bind:y="(backgroundImage.info.ratio < 1 ? -(((1 / backgroundImage.info.ratio) - 1) * pos) : 0) + '%'" v-bind:height="(backgroundImage.info.ratio < 1 ? ((1 / backgroundImage.info.ratio) * 100) : 100) + '%'" v-bind:width="(backgroundImage.info.ratio >= 1 ? (backgroundImage.info.ratio * 100) : 100) + '%'" />
```

Das ist nicht nur serh hässlich, es ist auch serh schwer zu debuggen und anzupassen. UM solche und mehr grafische Zusammenhänge zu automatisieren, gibt es mehrere Vue.js Directives, die solche Arbeiten automatisch erledigen.

#### Fit Image

Die Directive `v-fitimage` skaliert und positioniert ein `<image></image>` im `cover`-Stil. Die benötigten Informationen wie Maße des Bildes oder der `viewBox` werden automatisch erfasst. Das einzige Attribut ist `data-pos`, welches die Position des Bildes (in die jeweils überstehende Richtung) regelt. Dieser Wert liegt zwischen `-1` und `1`.

```html
<image xlink:href="<imgSource>" v-fitimage data-image-pos="0.5" />
```

*Selbstvertändlich bietet es sich an,* `data-pos` *typischerweise mittels* `v-bind:` *dynamisch aus dem Vue.js-Controller zu beziehen.*


#### Dynamic Size

Die Directive `v-dynamic` skaliert ein Element automatisch in eine Art festen Rahmen, der nicht überschritten werden darf. Sinnvoll ist diese Directive, wenn man ein dynamisch großes Element (wie z.B. Text) skalieren lassen möchte. Dabei wird eine Größe nie überschritten sondern immer auf die jeweilige skaliert, die die andere nicht überschreitet. Es ist wichtig, die `transform-origin` im `style` zu setzen, da die Skalierung von dieser aus stattfindet.


```html
<g v-dynamic data-dynamic-origin="none" data-dynamic-width="1140" data-dynamic-height="900" style="transform-origin: 30px 40px;">

</g>
```

Attribute:

1. `data-dynamic-origin`: Eine relativ zum Element befindliche `transform-origin`
2. `data-dynamic-width`: *Breite* auf die skaliert wird
2. `data-dynamic-height`: *Höhe* auf die skaliert wird


### Components

In manchen Fällen erleichtern auch *Vue-Components* die Arbeit.

#### Multiline Text

Die Component `<multiline-text>` positioniert einen Text automatisch mit mehreren Zeilen. Dabei kann er links- oder rechtsbündig sowie nach oben oder unten hin positioniert sein.

```html
<multiline-text x="40" y="550" padding="25 35" text="['Line 1', 'Line 2', 'Line 3']" lineheight="1.2" background="#f00" align="right" verticalalign="center" css="font-size: 150px; font-family: 'Jost-500'; fill: #FE0000;"></multiline-text>
```


Für weitere Details lohnt sich ein Blick in die bestehenden Templates ;-)
