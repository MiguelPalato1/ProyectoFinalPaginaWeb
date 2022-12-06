import { escape } from 'html-escaper';
/* empty css                                                   *//* empty css                        *//* empty css                            *//* empty css                           *//* empty css                          */
const ASTRO_VERSION = "1.4.2";
function createDeprecatedFetchContentFn() {
  return () => {
    throw new Error("Deprecated: Astro.fetchContent() has been replaced with Astro.glob().");
  };
}
function createAstroGlobFn() {
  const globHandler = (importMetaGlobResult, globValue) => {
    let allEntries = [...Object.values(importMetaGlobResult)];
    if (allEntries.length === 0) {
      throw new Error(`Astro.glob(${JSON.stringify(globValue())}) - no matches found.`);
    }
    return Promise.all(allEntries.map((fn) => fn()));
  };
  return globHandler;
}
function createAstro(filePathname, _site, projectRootStr) {
  const site = _site ? new URL(_site) : void 0;
  const referenceURL = new URL(filePathname, `http://localhost`);
  const projectRoot = new URL(projectRootStr);
  return {
    site,
    generator: `Astro v${ASTRO_VERSION}`,
    fetchContent: createDeprecatedFetchContentFn(),
    glob: createAstroGlobFn(),
    resolve(...segments) {
      let resolved = segments.reduce((u, segment) => new URL(segment, u), referenceURL).pathname;
      if (resolved.startsWith(projectRoot.pathname)) {
        resolved = "/" + resolved.slice(projectRoot.pathname.length);
      }
      return resolved;
    }
  };
}

const escapeHTML = escape;
class HTMLString extends String {
  get [Symbol.toStringTag]() {
    return "HTMLString";
  }
}
const markHTMLString = (value) => {
  if (value instanceof HTMLString) {
    return value;
  }
  if (typeof value === "string") {
    return new HTMLString(value);
  }
  return value;
};

class Metadata {
  constructor(filePathname, opts) {
    this.modules = opts.modules;
    this.hoisted = opts.hoisted;
    this.hydratedComponents = opts.hydratedComponents;
    this.clientOnlyComponents = opts.clientOnlyComponents;
    this.hydrationDirectives = opts.hydrationDirectives;
    this.mockURL = new URL(filePathname, "http://example.com");
    this.metadataCache = /* @__PURE__ */ new Map();
  }
  resolvePath(specifier) {
    if (specifier.startsWith(".")) {
      const resolved = new URL(specifier, this.mockURL).pathname;
      if (resolved.startsWith("/@fs") && resolved.endsWith(".jsx")) {
        return resolved.slice(0, resolved.length - 4);
      }
      return resolved;
    }
    return specifier;
  }
  getPath(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentUrl) || null;
  }
  getExport(Component) {
    const metadata = this.getComponentMetadata(Component);
    return (metadata == null ? void 0 : metadata.componentExport) || null;
  }
  getComponentMetadata(Component) {
    if (this.metadataCache.has(Component)) {
      return this.metadataCache.get(Component);
    }
    const metadata = this.findComponentMetadata(Component);
    this.metadataCache.set(Component, metadata);
    return metadata;
  }
  findComponentMetadata(Component) {
    const isCustomElement = typeof Component === "string";
    for (const { module, specifier } of this.modules) {
      const id = this.resolvePath(specifier);
      for (const [key, value] of Object.entries(module)) {
        if (isCustomElement) {
          if (key === "tagName" && Component === value) {
            return {
              componentExport: key,
              componentUrl: id
            };
          }
        } else if (Component === value) {
          return {
            componentExport: key,
            componentUrl: id
          };
        }
      }
    }
    return null;
  }
}
function createMetadata(filePathname, options) {
  return new Metadata(filePathname, options);
}

const PROP_TYPE = {
  Value: 0,
  JSON: 1,
  RegExp: 2,
  Date: 3,
  Map: 4,
  Set: 5,
  BigInt: 6,
  URL: 7,
  Uint8Array: 8,
  Uint16Array: 9,
  Uint32Array: 10
};
function serializeArray(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = value.map((v) => {
    return convertToSerializedForm(v, metadata, parents);
  });
  parents.delete(value);
  return serialized;
}
function serializeObject(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = Object.fromEntries(
    Object.entries(value).map(([k, v]) => {
      return [k, convertToSerializedForm(v, metadata, parents)];
    })
  );
  parents.delete(value);
  return serialized;
}
function convertToSerializedForm(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  const tag = Object.prototype.toString.call(value);
  switch (tag) {
    case "[object Date]": {
      return [PROP_TYPE.Date, value.toISOString()];
    }
    case "[object RegExp]": {
      return [PROP_TYPE.RegExp, value.source];
    }
    case "[object Map]": {
      return [
        PROP_TYPE.Map,
        JSON.stringify(serializeArray(Array.from(value), metadata, parents))
      ];
    }
    case "[object Set]": {
      return [
        PROP_TYPE.Set,
        JSON.stringify(serializeArray(Array.from(value), metadata, parents))
      ];
    }
    case "[object BigInt]": {
      return [PROP_TYPE.BigInt, value.toString()];
    }
    case "[object URL]": {
      return [PROP_TYPE.URL, value.toString()];
    }
    case "[object Array]": {
      return [PROP_TYPE.JSON, JSON.stringify(serializeArray(value, metadata, parents))];
    }
    case "[object Uint8Array]": {
      return [PROP_TYPE.Uint8Array, JSON.stringify(Array.from(value))];
    }
    case "[object Uint16Array]": {
      return [PROP_TYPE.Uint16Array, JSON.stringify(Array.from(value))];
    }
    case "[object Uint32Array]": {
      return [PROP_TYPE.Uint32Array, JSON.stringify(Array.from(value))];
    }
    default: {
      if (value !== null && typeof value === "object") {
        return [PROP_TYPE.Value, serializeObject(value, metadata, parents)];
      } else {
        return [PROP_TYPE.Value, value];
      }
    }
  }
}
function serializeProps(props, metadata) {
  const serialized = JSON.stringify(serializeObject(props, metadata));
  return serialized;
}

function serializeListValue(value) {
  const hash = {};
  push(value);
  return Object.keys(hash).join(" ");
  function push(item) {
    if (item && typeof item.forEach === "function")
      item.forEach(push);
    else if (item === Object(item))
      Object.keys(item).forEach((name) => {
        if (item[name])
          push(name);
      });
    else {
      item = item === false || item == null ? "" : String(item).trim();
      if (item) {
        item.split(/\s+/).forEach((name) => {
          hash[name] = true;
        });
      }
    }
  }
}

const HydrationDirectivesRaw = ["load", "idle", "media", "visible", "only"];
const HydrationDirectives = new Set(HydrationDirectivesRaw);
const HydrationDirectiveProps = new Set(HydrationDirectivesRaw.map((n) => `client:${n}`));
function extractDirectives(inputProps) {
  let extracted = {
    isPage: false,
    hydration: null,
    props: {}
  };
  for (const [key, value] of Object.entries(inputProps)) {
    if (key.startsWith("server:")) {
      if (key === "server:root") {
        extracted.isPage = true;
      }
    }
    if (key.startsWith("client:")) {
      if (!extracted.hydration) {
        extracted.hydration = {
          directive: "",
          value: "",
          componentUrl: "",
          componentExport: { value: "" }
        };
      }
      switch (key) {
        case "client:component-path": {
          extracted.hydration.componentUrl = value;
          break;
        }
        case "client:component-export": {
          extracted.hydration.componentExport.value = value;
          break;
        }
        case "client:component-hydration": {
          break;
        }
        case "client:display-name": {
          break;
        }
        default: {
          extracted.hydration.directive = key.split(":")[1];
          extracted.hydration.value = value;
          if (!HydrationDirectives.has(extracted.hydration.directive)) {
            throw new Error(
              `Error: invalid hydration directive "${key}". Supported hydration methods: ${Array.from(
                HydrationDirectiveProps
              ).join(", ")}`
            );
          }
          if (extracted.hydration.directive === "media" && typeof extracted.hydration.value !== "string") {
            throw new Error(
              'Error: Media query must be provided for "client:media", similar to client:media="(max-width: 600px)"'
            );
          }
          break;
        }
      }
    } else if (key === "class:list") {
      if (value) {
        extracted.props[key.slice(0, -5)] = serializeListValue(value);
      }
    } else {
      extracted.props[key] = value;
    }
  }
  return extracted;
}
async function generateHydrateScript(scriptOptions, metadata) {
  const { renderer, result, astroId, props, attrs } = scriptOptions;
  const { hydrate, componentUrl, componentExport } = metadata;
  if (!componentExport.value) {
    throw new Error(
      `Unable to resolve a valid export for "${metadata.displayName}"! Please open an issue at https://astro.build/issues!`
    );
  }
  const island = {
    children: "",
    props: {
      uid: astroId
    }
  };
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      island.props[key] = value;
    }
  }
  island.props["component-url"] = await result.resolve(decodeURI(componentUrl));
  if (renderer.clientEntrypoint) {
    island.props["component-export"] = componentExport.value;
    island.props["renderer-url"] = await result.resolve(decodeURI(renderer.clientEntrypoint));
    island.props["props"] = escapeHTML(serializeProps(props, metadata));
  }
  island.props["ssr"] = "";
  island.props["client"] = hydrate;
  let beforeHydrationUrl = await result.resolve("astro:scripts/before-hydration.js");
  if (beforeHydrationUrl.length) {
    island.props["before-hydration-url"] = beforeHydrationUrl;
  }
  island.props["opts"] = escapeHTML(
    JSON.stringify({
      name: metadata.displayName,
      value: metadata.hydrateArgs || ""
    })
  );
  return island;
}

class SlotString extends HTMLString {
  constructor(content, instructions) {
    super(content);
    this.instructions = instructions;
  }
}
async function renderSlot(_result, slotted, fallback) {
  if (slotted) {
    let iterator = renderChild(slotted);
    let content = "";
    let instructions = null;
    for await (const chunk of iterator) {
      if (chunk.type === "directive") {
        if (instructions === null) {
          instructions = [];
        }
        instructions.push(chunk);
      } else {
        content += chunk;
      }
    }
    return markHTMLString(new SlotString(content, instructions));
  }
  return fallback;
}
async function renderSlots(result, slots = {}) {
  let slotInstructions = null;
  let children = {};
  if (slots) {
    await Promise.all(
      Object.entries(slots).map(
        ([key, value]) => renderSlot(result, value).then((output) => {
          if (output.instructions) {
            if (slotInstructions === null) {
              slotInstructions = [];
            }
            slotInstructions.push(...output.instructions);
          }
          children[key] = output;
        })
      )
    );
  }
  return { slotInstructions, children };
}

async function* renderChild(child) {
  child = await child;
  if (child instanceof SlotString) {
    if (child.instructions) {
      yield* child.instructions;
    }
    yield child;
  } else if (child instanceof HTMLString) {
    yield child;
  } else if (Array.isArray(child)) {
    for (const value of child) {
      yield markHTMLString(await renderChild(value));
    }
  } else if (typeof child === "function") {
    yield* renderChild(child());
  } else if (typeof child === "string") {
    yield markHTMLString(escapeHTML(child));
  } else if (!child && child !== 0) ; else if (child instanceof AstroComponent || Object.prototype.toString.call(child) === "[object AstroComponent]") {
    yield* renderAstroComponent(child);
  } else if (ArrayBuffer.isView(child)) {
    yield child;
  } else if (typeof child === "object" && (Symbol.asyncIterator in child || Symbol.iterator in child)) {
    yield* child;
  } else {
    yield child;
  }
}

var idle_prebuilt_default = `(self.Astro=self.Astro||{}).idle=t=>{const e=async()=>{await(await t())()};"requestIdleCallback"in window?window.requestIdleCallback(e):setTimeout(e,200)},window.dispatchEvent(new Event("astro:idle"));`;

var load_prebuilt_default = `(self.Astro=self.Astro||{}).load=a=>{(async()=>await(await a())())()},window.dispatchEvent(new Event("astro:load"));`;

var media_prebuilt_default = `(self.Astro=self.Astro||{}).media=(s,a)=>{const t=async()=>{await(await s())()};if(a.value){const e=matchMedia(a.value);e.matches?t():e.addEventListener("change",t,{once:!0})}},window.dispatchEvent(new Event("astro:media"));`;

var only_prebuilt_default = `(self.Astro=self.Astro||{}).only=t=>{(async()=>await(await t())())()},window.dispatchEvent(new Event("astro:only"));`;

var visible_prebuilt_default = `(self.Astro=self.Astro||{}).visible=(s,c,n)=>{const r=async()=>{await(await s())()};let i=new IntersectionObserver(e=>{for(const t of e)if(!!t.isIntersecting){i.disconnect(),r();break}});for(let e=0;e<n.children.length;e++){const t=n.children[e];i.observe(t)}},window.dispatchEvent(new Event("astro:visible"));`;

var astro_island_prebuilt_default = `var l;{const c={0:t=>t,1:t=>JSON.parse(t,o),2:t=>new RegExp(t),3:t=>new Date(t),4:t=>new Map(JSON.parse(t,o)),5:t=>new Set(JSON.parse(t,o)),6:t=>BigInt(t),7:t=>new URL(t),8:t=>new Uint8Array(JSON.parse(t)),9:t=>new Uint16Array(JSON.parse(t)),10:t=>new Uint32Array(JSON.parse(t))},o=(t,s)=>{if(t===""||!Array.isArray(s))return s;const[e,n]=s;return e in c?c[e](n):void 0};customElements.get("astro-island")||customElements.define("astro-island",(l=class extends HTMLElement{constructor(){super(...arguments);this.hydrate=()=>{if(!this.hydrator||this.parentElement&&this.parentElement.closest("astro-island[ssr]"))return;const s=this.querySelectorAll("astro-slot"),e={},n=this.querySelectorAll("template[data-astro-template]");for(const r of n){const i=r.closest(this.tagName);!i||!i.isSameNode(this)||(e[r.getAttribute("data-astro-template")||"default"]=r.innerHTML,r.remove())}for(const r of s){const i=r.closest(this.tagName);!i||!i.isSameNode(this)||(e[r.getAttribute("name")||"default"]=r.innerHTML)}const a=this.hasAttribute("props")?JSON.parse(this.getAttribute("props"),o):{};this.hydrator(this)(this.Component,a,e,{client:this.getAttribute("client")}),this.removeAttribute("ssr"),window.removeEventListener("astro:hydrate",this.hydrate),window.dispatchEvent(new CustomEvent("astro:hydrate"))}}connectedCallback(){!this.hasAttribute("await-children")||this.firstChild?this.childrenConnectedCallback():new MutationObserver((s,e)=>{e.disconnect(),this.childrenConnectedCallback()}).observe(this,{childList:!0})}async childrenConnectedCallback(){window.addEventListener("astro:hydrate",this.hydrate);let s=this.getAttribute("before-hydration-url");s&&await import(s),this.start()}start(){const s=JSON.parse(this.getAttribute("opts")),e=this.getAttribute("client");if(Astro[e]===void 0){window.addEventListener(\`astro:\${e}\`,()=>this.start(),{once:!0});return}Astro[e](async()=>{const n=this.getAttribute("renderer-url"),[a,{default:r}]=await Promise.all([import(this.getAttribute("component-url")),n?import(n):()=>()=>{}]),i=this.getAttribute("component-export")||"default";if(!i.includes("."))this.Component=a[i];else{this.Component=a;for(const d of i.split("."))this.Component=this.Component[d]}return this.hydrator=r,this.hydrate},s,this)}attributeChangedCallback(){this.hydrator&&this.hydrate()}},l.observedAttributes=["props"],l))}`;

function determineIfNeedsHydrationScript(result) {
  if (result._metadata.hasHydrationScript) {
    return false;
  }
  return result._metadata.hasHydrationScript = true;
}
const hydrationScripts = {
  idle: idle_prebuilt_default,
  load: load_prebuilt_default,
  only: only_prebuilt_default,
  media: media_prebuilt_default,
  visible: visible_prebuilt_default
};
function determinesIfNeedsDirectiveScript(result, directive) {
  if (result._metadata.hasDirectives.has(directive)) {
    return false;
  }
  result._metadata.hasDirectives.add(directive);
  return true;
}
function getDirectiveScriptText(directive) {
  if (!(directive in hydrationScripts)) {
    throw new Error(`Unknown directive: ${directive}`);
  }
  const directiveScriptText = hydrationScripts[directive];
  return directiveScriptText;
}
function getPrescripts(type, directive) {
  switch (type) {
    case "both":
      return `<style>astro-island,astro-slot{display:contents}</style><script>${getDirectiveScriptText(directive) + astro_island_prebuilt_default}<\/script>`;
    case "directive":
      return `<script>${getDirectiveScriptText(directive)}<\/script>`;
  }
  return "";
}

const Fragment = Symbol.for("astro:fragment");
const Renderer = Symbol.for("astro:renderer");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function stringifyChunk(result, chunk) {
  switch (chunk.type) {
    case "directive": {
      const { hydration } = chunk;
      let needsHydrationScript = hydration && determineIfNeedsHydrationScript(result);
      let needsDirectiveScript = hydration && determinesIfNeedsDirectiveScript(result, hydration.directive);
      let prescriptType = needsHydrationScript ? "both" : needsDirectiveScript ? "directive" : null;
      if (prescriptType) {
        let prescripts = getPrescripts(prescriptType, hydration.directive);
        return markHTMLString(prescripts);
      } else {
        return "";
      }
    }
    default: {
      return chunk.toString();
    }
  }
}
class HTMLParts {
  constructor() {
    this.parts = [];
  }
  append(part, result) {
    if (ArrayBuffer.isView(part)) {
      this.parts.push(part);
    } else {
      this.parts.push(stringifyChunk(result, part));
    }
  }
  toString() {
    let html = "";
    for (const part of this.parts) {
      if (ArrayBuffer.isView(part)) {
        html += decoder.decode(part);
      } else {
        html += part;
      }
    }
    return html;
  }
  toArrayBuffer() {
    this.parts.forEach((part, i) => {
      if (!ArrayBuffer.isView(part)) {
        this.parts[i] = encoder.encode(String(part));
      }
    });
    return concatUint8Arrays(this.parts);
  }
}
function concatUint8Arrays(arrays) {
  let len = 0;
  arrays.forEach((arr) => len += arr.length);
  let merged = new Uint8Array(len);
  let offset = 0;
  arrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  return merged;
}

function validateComponentProps(props, displayName) {
  var _a;
  if (((_a = (Object.assign({"BASE_URL":"/","MODE":"production","DEV":false,"PROD":true},{_:process.env._,}))) == null ? void 0 : _a.DEV) && props != null) {
    for (const prop of Object.keys(props)) {
      if (HydrationDirectiveProps.has(prop)) {
        console.warn(
          `You are attempting to render <${displayName} ${prop} />, but ${displayName} is an Astro component. Astro components do not render in the client and should not have a hydration directive. Please use a framework component for client rendering.`
        );
      }
    }
  }
}
class AstroComponent {
  constructor(htmlParts, expressions) {
    this.htmlParts = htmlParts;
    this.expressions = expressions;
  }
  get [Symbol.toStringTag]() {
    return "AstroComponent";
  }
  async *[Symbol.asyncIterator]() {
    const { htmlParts, expressions } = this;
    for (let i = 0; i < htmlParts.length; i++) {
      const html = htmlParts[i];
      const expression = expressions[i];
      yield markHTMLString(html);
      yield* renderChild(expression);
    }
  }
}
function isAstroComponent(obj) {
  return typeof obj === "object" && Object.prototype.toString.call(obj) === "[object AstroComponent]";
}
function isAstroComponentFactory(obj) {
  return obj == null ? false : !!obj.isAstroComponentFactory;
}
async function* renderAstroComponent(component) {
  for await (const value of component) {
    if (value || value === 0) {
      for await (const chunk of renderChild(value)) {
        switch (chunk.type) {
          case "directive": {
            yield chunk;
            break;
          }
          default: {
            yield markHTMLString(chunk);
            break;
          }
        }
      }
    }
  }
}
async function renderToString(result, componentFactory, props, children) {
  const Component = await componentFactory(result, props, children);
  if (!isAstroComponent(Component)) {
    const response = Component;
    throw response;
  }
  let parts = new HTMLParts();
  for await (const chunk of renderAstroComponent(Component)) {
    parts.append(chunk, result);
  }
  return parts.toString();
}
async function renderToIterable(result, componentFactory, displayName, props, children) {
  validateComponentProps(props, displayName);
  const Component = await componentFactory(result, props, children);
  if (!isAstroComponent(Component)) {
    console.warn(
      `Returning a Response is only supported inside of page components. Consider refactoring this logic into something like a function that can be used in the page.`
    );
    const response = Component;
    throw response;
  }
  return renderAstroComponent(Component);
}
async function renderTemplate(htmlParts, ...expressions) {
  return new AstroComponent(htmlParts, expressions);
}

/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
const dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary = dictionary.length;
function bitwise(str) {
  let hash = 0;
  if (str.length === 0)
    return hash;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  return hash;
}
function shorthash(text) {
  let num;
  let result = "";
  let integer = bitwise(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary) {
    num = integer % binary;
    integer = Math.floor(integer / binary);
    result = dictionary[num] + result;
  }
  if (integer > 0) {
    result = dictionary[integer] + result;
  }
  return sign + result;
}

const voidElementNames = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;
const htmlBooleanAttributes = /^(allowfullscreen|async|autofocus|autoplay|controls|default|defer|disabled|disablepictureinpicture|disableremoteplayback|formnovalidate|hidden|loop|nomodule|novalidate|open|playsinline|readonly|required|reversed|scoped|seamless|itemscope)$/i;
const htmlEnumAttributes = /^(contenteditable|draggable|spellcheck|value)$/i;
const svgEnumAttributes = /^(autoReverse|externalResourcesRequired|focusable|preserveAlpha)$/i;
const STATIC_DIRECTIVES = /* @__PURE__ */ new Set(["set:html", "set:text"]);
const toIdent = (k) => k.trim().replace(/(?:(?!^)\b\w|\s+|[^\w]+)/g, (match, index) => {
  if (/[^\w]|\s/.test(match))
    return "";
  return index === 0 ? match : match.toUpperCase();
});
const toAttributeString = (value, shouldEscape = true) => shouldEscape ? String(value).replace(/&/g, "&#38;").replace(/"/g, "&#34;") : value;
const kebab = (k) => k.toLowerCase() === k ? k : k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
const toStyleString = (obj) => Object.entries(obj).map(([k, v]) => `${kebab(k)}:${v}`).join(";");
function defineScriptVars(vars) {
  let output = "";
  for (const [key, value] of Object.entries(vars)) {
    output += `const ${toIdent(key)} = ${JSON.stringify(value)};
`;
  }
  return markHTMLString(output);
}
function formatList(values) {
  if (values.length === 1) {
    return values[0];
  }
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
function addAttribute(value, key, shouldEscape = true) {
  if (value == null) {
    return "";
  }
  if (value === false) {
    if (htmlEnumAttributes.test(key) || svgEnumAttributes.test(key)) {
      return markHTMLString(` ${key}="false"`);
    }
    return "";
  }
  if (STATIC_DIRECTIVES.has(key)) {
    console.warn(`[astro] The "${key}" directive cannot be applied dynamically at runtime. It will not be rendered as an attribute.

Make sure to use the static attribute syntax (\`${key}={value}\`) instead of the dynamic spread syntax (\`{...{ "${key}": value }}\`).`);
    return "";
  }
  if (key === "class:list") {
    const listValue = toAttributeString(serializeListValue(value));
    if (listValue === "") {
      return "";
    }
    return markHTMLString(` ${key.slice(0, -5)}="${listValue}"`);
  }
  if (key === "style" && !(value instanceof HTMLString) && typeof value === "object") {
    return markHTMLString(` ${key}="${toStyleString(value)}"`);
  }
  if (key === "className") {
    return markHTMLString(` class="${toAttributeString(value, shouldEscape)}"`);
  }
  if (value === true && (key.startsWith("data-") || htmlBooleanAttributes.test(key))) {
    return markHTMLString(` ${key}`);
  } else {
    return markHTMLString(` ${key}="${toAttributeString(value, shouldEscape)}"`);
  }
}
function internalSpreadAttributes(values, shouldEscape = true) {
  let output = "";
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, shouldEscape);
  }
  return markHTMLString(output);
}
function renderElement$1(name, { props: _props, children = "" }, shouldEscape = true) {
  const { lang: _, "data-astro-id": astroId, "define:vars": defineVars, ...props } = _props;
  if (defineVars) {
    if (name === "style") {
      delete props["is:global"];
      delete props["is:scoped"];
    }
    if (name === "script") {
      delete props.hoist;
      children = defineScriptVars(defineVars) + "\n" + children;
    }
  }
  if ((children == null || children == "") && voidElementNames.test(name)) {
    return `<${name}${internalSpreadAttributes(props, shouldEscape)} />`;
  }
  return `<${name}${internalSpreadAttributes(props, shouldEscape)}>${children}</${name}>`;
}

function componentIsHTMLElement(Component) {
  return typeof HTMLElement !== "undefined" && HTMLElement.isPrototypeOf(Component);
}
async function renderHTMLElement(result, constructor, props, slots) {
  const name = getHTMLElementName(constructor);
  let attrHTML = "";
  for (const attr in props) {
    attrHTML += ` ${attr}="${toAttributeString(await props[attr])}"`;
  }
  return markHTMLString(
    `<${name}${attrHTML}>${await renderSlot(result, slots == null ? void 0 : slots.default)}</${name}>`
  );
}
function getHTMLElementName(constructor) {
  const definedName = customElements.getName(constructor);
  if (definedName)
    return definedName;
  const assignedName = constructor.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
  return assignedName;
}

const rendererAliases = /* @__PURE__ */ new Map([["solid", "solid-js"]]);
function guessRenderers(componentUrl) {
  const extname = componentUrl == null ? void 0 : componentUrl.split(".").pop();
  switch (extname) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/vue (jsx)"];
    default:
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/vue", "@astrojs/svelte"];
  }
}
function getComponentType(Component) {
  if (Component === Fragment) {
    return "fragment";
  }
  if (Component && typeof Component === "object" && Component["astro:html"]) {
    return "html";
  }
  if (isAstroComponentFactory(Component)) {
    return "astro-factory";
  }
  return "unknown";
}
async function renderComponent(result, displayName, Component, _props, slots = {}) {
  var _a;
  Component = await Component;
  switch (getComponentType(Component)) {
    case "fragment": {
      const children2 = await renderSlot(result, slots == null ? void 0 : slots.default);
      if (children2 == null) {
        return children2;
      }
      return markHTMLString(children2);
    }
    case "html": {
      const { slotInstructions: slotInstructions2, children: children2 } = await renderSlots(result, slots);
      const html2 = Component.render({ slots: children2 });
      const hydrationHtml = slotInstructions2 ? slotInstructions2.map((instr) => stringifyChunk(result, instr)).join("") : "";
      return markHTMLString(hydrationHtml + html2);
    }
    case "astro-factory": {
      async function* renderAstroComponentInline() {
        let iterable = await renderToIterable(result, Component, displayName, _props, slots);
        yield* iterable;
      }
      return renderAstroComponentInline();
    }
  }
  if (!Component && !_props["client:only"]) {
    throw new Error(
      `Unable to render ${displayName} because it is ${Component}!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  const { renderers } = result._metadata;
  const metadata = { displayName };
  const { hydration, isPage, props } = extractDirectives(_props);
  let html = "";
  let attrs = void 0;
  if (hydration) {
    metadata.hydrate = hydration.directive;
    metadata.hydrateArgs = hydration.value;
    metadata.componentExport = hydration.componentExport;
    metadata.componentUrl = hydration.componentUrl;
  }
  const probableRendererNames = guessRenderers(metadata.componentUrl);
  if (Array.isArray(renderers) && renderers.length === 0 && typeof Component !== "string" && !componentIsHTMLElement(Component)) {
    const message = `Unable to render ${metadata.displayName}!

There are no \`integrations\` set in your \`astro.config.mjs\` file.
Did you mean to add ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`;
    throw new Error(message);
  }
  const { children, slotInstructions } = await renderSlots(result, slots);
  let renderer;
  if (metadata.hydrate !== "only") {
    if (Component && Component[Renderer]) {
      const rendererName = Component[Renderer];
      renderer = renderers.find(({ name }) => name === rendererName);
    }
    if (!renderer) {
      let error;
      for (const r of renderers) {
        try {
          if (await r.ssr.check.call({ result }, Component, props, children)) {
            renderer = r;
            break;
          }
        } catch (e) {
          error ?? (error = e);
        }
      }
      if (!renderer && error) {
        throw error;
      }
    }
    if (!renderer && typeof HTMLElement === "function" && componentIsHTMLElement(Component)) {
      const output = renderHTMLElement(result, Component, _props, slots);
      return output;
    }
  } else {
    if (metadata.hydrateArgs) {
      const passedName = metadata.hydrateArgs;
      const rendererName = rendererAliases.has(passedName) ? rendererAliases.get(passedName) : passedName;
      renderer = renderers.find(
        ({ name }) => name === `@astrojs/${rendererName}` || name === rendererName
      );
    }
    if (!renderer && renderers.length === 1) {
      renderer = renderers[0];
    }
    if (!renderer) {
      const extname = (_a = metadata.componentUrl) == null ? void 0 : _a.split(".").pop();
      renderer = renderers.filter(
        ({ name }) => name === `@astrojs/${extname}` || name === extname
      )[0];
    }
  }
  if (!renderer) {
    if (metadata.hydrate === "only") {
      throw new Error(`Unable to render ${metadata.displayName}!

Using the \`client:only\` hydration strategy, Astro needs a hint to use the correct renderer.
Did you mean to pass <${metadata.displayName} client:only="${probableRendererNames.map((r) => r.replace("@astrojs/", "")).join("|")}" />
`);
    } else if (typeof Component !== "string") {
      const matchingRenderers = renderers.filter((r) => probableRendererNames.includes(r.name));
      const plural = renderers.length > 1;
      if (matchingRenderers.length === 0) {
        throw new Error(`Unable to render ${metadata.displayName}!

There ${plural ? "are" : "is"} ${renderers.length} renderer${plural ? "s" : ""} configured in your \`astro.config.mjs\` file,
but ${plural ? "none were" : "it was not"} able to server-side render ${metadata.displayName}.

Did you mean to enable ${formatList(probableRendererNames.map((r) => "`" + r + "`"))}?`);
      } else if (matchingRenderers.length === 1) {
        renderer = matchingRenderers[0];
        ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
          { result },
          Component,
          props,
          children,
          metadata
        ));
      } else {
        throw new Error(`Unable to render ${metadata.displayName}!

This component likely uses ${formatList(probableRendererNames)},
but Astro encountered an error during server-side rendering.

Please ensure that ${metadata.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
      }
    }
  } else {
    if (metadata.hydrate === "only") {
      html = await renderSlot(result, slots == null ? void 0 : slots.fallback);
    } else {
      ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
        { result },
        Component,
        props,
        children,
        metadata
      ));
    }
  }
  if (renderer && !renderer.clientEntrypoint && renderer.name !== "@astrojs/lit" && metadata.hydrate) {
    throw new Error(
      `${metadata.displayName} component has a \`client:${metadata.hydrate}\` directive, but no client entrypoint was provided by ${renderer.name}!`
    );
  }
  if (!html && typeof Component === "string") {
    const childSlots = Object.values(children).join("");
    const iterable = renderAstroComponent(
      await renderTemplate`<${Component}${internalSpreadAttributes(props)}${markHTMLString(
        childSlots === "" && voidElementNames.test(Component) ? `/>` : `>${childSlots}</${Component}>`
      )}`
    );
    html = "";
    for await (const chunk of iterable) {
      html += chunk;
    }
  }
  if (!hydration) {
    if (isPage || (renderer == null ? void 0 : renderer.name) === "astro:jsx") {
      return html;
    }
    return markHTMLString(html.replace(/\<\/?astro-slot\>/g, ""));
  }
  const astroId = shorthash(
    `<!--${metadata.componentExport.value}:${metadata.componentUrl}-->
${html}
${serializeProps(
      props,
      metadata
    )}`
  );
  const island = await generateHydrateScript(
    { renderer, result, astroId, props, attrs },
    metadata
  );
  let unrenderedSlots = [];
  if (html) {
    if (Object.keys(children).length > 0) {
      for (const key of Object.keys(children)) {
        if (!html.includes(key === "default" ? `<astro-slot>` : `<astro-slot name="${key}">`)) {
          unrenderedSlots.push(key);
        }
      }
    }
  } else {
    unrenderedSlots = Object.keys(children);
  }
  const template = unrenderedSlots.length > 0 ? unrenderedSlots.map(
    (key) => `<template data-astro-template${key !== "default" ? `="${key}"` : ""}>${children[key]}</template>`
  ).join("") : "";
  island.children = `${html ?? ""}${template}`;
  if (island.children) {
    island.props["await-children"] = "";
  }
  async function* renderAll() {
    if (slotInstructions) {
      yield* slotInstructions;
    }
    yield { type: "directive", hydration, result };
    yield markHTMLString(renderElement$1("astro-island", island, false));
  }
  return renderAll();
}

const uniqueElements = (item, index, all) => {
  const props = JSON.stringify(item.props);
  const children = item.children;
  return index === all.findIndex((i) => JSON.stringify(i.props) === props && i.children == children);
};
function renderHead(result) {
  result._metadata.hasRenderedHead = true;
  const styles = Array.from(result.styles).filter(uniqueElements).map((style) => renderElement$1("style", style));
  result.styles.clear();
  const scripts = Array.from(result.scripts).filter(uniqueElements).map((script, i) => {
    return renderElement$1("script", script, false);
  });
  const links = Array.from(result.links).filter(uniqueElements).map((link) => renderElement$1("link", link, false));
  return markHTMLString(links.join("\n") + styles.join("\n") + scripts.join("\n"));
}
async function* maybeRenderHead(result) {
  if (result._metadata.hasRenderedHead) {
    return;
  }
  yield renderHead(result);
}

typeof process === "object" && Object.prototype.toString.call(process) === "[object process]";

function createComponent(cb) {
  cb.isAstroComponentFactory = true;
  return cb;
}
function spreadAttributes(values, _name, { class: scopedClassName } = {}) {
  let output = "";
  if (scopedClassName) {
    if (typeof values.class !== "undefined") {
      values.class += ` ${scopedClassName}`;
    } else if (typeof values["class:list"] !== "undefined") {
      values["class:list"] = [values["class:list"], scopedClassName];
    } else {
      values.class = scopedClassName;
    }
  }
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, true);
  }
  return markHTMLString(output);
}

const AstroJSX = "astro:jsx";
const Empty = Symbol("empty");
const toSlotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
function isVNode(vnode) {
  return vnode && typeof vnode === "object" && vnode[AstroJSX];
}
function transformSlots(vnode) {
  if (typeof vnode.type === "string")
    return vnode;
  const slots = {};
  if (isVNode(vnode.props.children)) {
    const child = vnode.props.children;
    if (!isVNode(child))
      return;
    if (!("slot" in child.props))
      return;
    const name = toSlotName(child.props.slot);
    slots[name] = [child];
    slots[name]["$$slot"] = true;
    delete child.props.slot;
    delete vnode.props.children;
  }
  if (Array.isArray(vnode.props.children)) {
    vnode.props.children = vnode.props.children.map((child) => {
      if (!isVNode(child))
        return child;
      if (!("slot" in child.props))
        return child;
      const name = toSlotName(child.props.slot);
      if (Array.isArray(slots[name])) {
        slots[name].push(child);
      } else {
        slots[name] = [child];
        slots[name]["$$slot"] = true;
      }
      delete child.props.slot;
      return Empty;
    }).filter((v) => v !== Empty);
  }
  Object.assign(vnode.props, slots);
}
function markRawChildren(child) {
  if (typeof child === "string")
    return markHTMLString(child);
  if (Array.isArray(child))
    return child.map((c) => markRawChildren(c));
  return child;
}
function transformSetDirectives(vnode) {
  if (!("set:html" in vnode.props || "set:text" in vnode.props))
    return;
  if ("set:html" in vnode.props) {
    const children = markRawChildren(vnode.props["set:html"]);
    delete vnode.props["set:html"];
    Object.assign(vnode.props, { children });
    return;
  }
  if ("set:text" in vnode.props) {
    const children = vnode.props["set:text"];
    delete vnode.props["set:text"];
    Object.assign(vnode.props, { children });
    return;
  }
}
function createVNode(type, props) {
  const vnode = {
    [Renderer]: "astro:jsx",
    [AstroJSX]: true,
    type,
    props: props ?? {}
  };
  transformSetDirectives(vnode);
  transformSlots(vnode);
  return vnode;
}

const ClientOnlyPlaceholder = "astro-client-only";
const skipAstroJSXCheck = /* @__PURE__ */ new WeakSet();
let originalConsoleError;
let consoleFilterRefs = 0;
async function renderJSX(result, vnode) {
  switch (true) {
    case vnode instanceof HTMLString:
      if (vnode.toString().trim() === "") {
        return "";
      }
      return vnode;
    case typeof vnode === "string":
      return markHTMLString(escapeHTML(vnode));
    case (!vnode && vnode !== 0):
      return "";
    case Array.isArray(vnode):
      return markHTMLString(
        (await Promise.all(vnode.map((v) => renderJSX(result, v)))).join("")
      );
  }
  if (isVNode(vnode)) {
    switch (true) {
      case !vnode.type: {
        throw new Error(`Unable to render ${result._metadata.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`);
      }
      case vnode.type === Symbol.for("astro:fragment"):
        return renderJSX(result, vnode.props.children);
      case vnode.type.isAstroComponentFactory: {
        let props = {};
        let slots = {};
        for (const [key, value] of Object.entries(vnode.props ?? {})) {
          if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
            slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
          } else {
            props[key] = value;
          }
        }
        return markHTMLString(await renderToString(result, vnode.type, props, slots));
      }
      case (!vnode.type && vnode.type !== 0):
        return "";
      case (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder):
        return markHTMLString(await renderElement(result, vnode.type, vnode.props ?? {}));
    }
    if (vnode.type) {
      let extractSlots2 = function(child) {
        if (Array.isArray(child)) {
          return child.map((c) => extractSlots2(c));
        }
        if (!isVNode(child)) {
          _slots.default.push(child);
          return;
        }
        if ("slot" in child.props) {
          _slots[child.props.slot] = [..._slots[child.props.slot] ?? [], child];
          delete child.props.slot;
          return;
        }
        _slots.default.push(child);
      };
      if (typeof vnode.type === "function" && vnode.type["astro:renderer"]) {
        skipAstroJSXCheck.add(vnode.type);
      }
      if (typeof vnode.type === "function" && vnode.props["server:root"]) {
        const output2 = await vnode.type(vnode.props ?? {});
        return await renderJSX(result, output2);
      }
      if (typeof vnode.type === "function" && !skipAstroJSXCheck.has(vnode.type)) {
        useConsoleFilter();
        try {
          const output2 = await vnode.type(vnode.props ?? {});
          if (output2 && output2[AstroJSX]) {
            return await renderJSX(result, output2);
          } else if (!output2) {
            return await renderJSX(result, output2);
          }
        } catch (e) {
          skipAstroJSXCheck.add(vnode.type);
        } finally {
          finishUsingConsoleFilter();
        }
      }
      const { children = null, ...props } = vnode.props ?? {};
      const _slots = {
        default: []
      };
      extractSlots2(children);
      for (const [key, value] of Object.entries(props)) {
        if (value["$$slot"]) {
          _slots[key] = value;
          delete props[key];
        }
      }
      const slotPromises = [];
      const slots = {};
      for (const [key, value] of Object.entries(_slots)) {
        slotPromises.push(
          renderJSX(result, value).then((output2) => {
            if (output2.toString().trim().length === 0)
              return;
            slots[key] = () => output2;
          })
        );
      }
      await Promise.all(slotPromises);
      let output;
      if (vnode.type === ClientOnlyPlaceholder && vnode.props["client:only"]) {
        output = await renderComponent(
          result,
          vnode.props["client:display-name"] ?? "",
          null,
          props,
          slots
        );
      } else {
        output = await renderComponent(
          result,
          typeof vnode.type === "function" ? vnode.type.name : vnode.type,
          vnode.type,
          props,
          slots
        );
      }
      if (typeof output !== "string" && Symbol.asyncIterator in output) {
        let parts = new HTMLParts();
        for await (const chunk of output) {
          parts.append(chunk, result);
        }
        return markHTMLString(parts.toString());
      } else {
        return markHTMLString(output);
      }
    }
  }
  return markHTMLString(`${vnode}`);
}
async function renderElement(result, tag, { children, ...props }) {
  return markHTMLString(
    `<${tag}${spreadAttributes(props)}${markHTMLString(
      (children == null || children == "") && voidElementNames.test(tag) ? `/>` : `>${children == null ? "" : await renderJSX(result, children)}</${tag}>`
    )}`
  );
}
function useConsoleFilter() {
  consoleFilterRefs++;
  if (!originalConsoleError) {
    originalConsoleError = console.error;
    try {
      console.error = filteredConsoleError;
    } catch (error) {
    }
  }
}
function finishUsingConsoleFilter() {
  consoleFilterRefs--;
}
function filteredConsoleError(msg, ...rest) {
  if (consoleFilterRefs > 0 && typeof msg === "string") {
    const isKnownReactHookError = msg.includes("Warning: Invalid hook call.") && msg.includes("https://reactjs.org/link/invalid-hook-call");
    if (isKnownReactHookError)
      return;
  }
  originalConsoleError(msg, ...rest);
}

const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
async function check(Component, props, { default: children = null, ...slotted } = {}) {
  if (typeof Component !== "function")
    return false;
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  try {
    const result = await Component({ ...props, ...slots, children });
    return result[AstroJSX];
  } catch (e) {
  }
  return false;
}
async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  const { result } = this;
  const html = await renderJSX(result, createVNode(Component, { ...props, ...slots, children }));
  return { html };
}
var server_default = {
  check,
  renderToStaticMarkup
};

var __freeze$2 = Object.freeze;
var __defProp$2 = Object.defineProperty;
var __template$2 = (cooked, raw) => __freeze$2(__defProp$2(cooked, "raw", { value: __freeze$2(raw || cooked.slice()) }));
var _a$2;
const $$metadata$4 = createMetadata("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/layouts/Layout.astro", { modules: [], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$4 = createAstro("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/layouts/Layout.astro", "", "file:///Users/miguelpalato/Desktop/ProyectosDisen%CC%83oWeb/ProyectoFinalPagina/");
const $$Layout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate(_a$2 || (_a$2 = __template$2(['<html lang="en">\n	<head>\n		<meta charset="UTF-8">\n		<meta name="viewport" content="width=device-width">\n		<link rel="icon" type="image/svg+xml" href="/public/Logo.svg">\n		<meta name="generator"', '>\n		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">\n		<script src="https://kit.fontawesome.com/0f765658a1.js" crossorigin="anonymous"><\/script>\n		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">\n		<link rel="preconnect" href="https://fonts.googleapis.com">\n		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n		<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap" rel="stylesheet">\n		<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet">\n		<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@800&display=swap" rel="stylesheet">\n		<title>', "</title>\n	", '</head>\n    <body>\n		<div class="container-fluid" style="z-index-100">\n		<a class="logoNav top-0 start-10" href="/#">\n			<img src="/public/logo-icon.png" alt="" width="120">\n		 </a>\n		</div>\n		<nav class="menuV">\n			<a href="/#" class="border border-dark rounded texto-borde"><h5>Home</h5></a>\n			<a href="/artista" class=" border border-dark rounded texto-borde"><h5>About</h5></a>\n			<a href="/proyectos" class=" border border-dark rounded texto-borde"><h5>Work</h5></a>\n			<a href="/contacto" class=" border border-dark rounded texto-borde"><h5>Contact</h5></a>\n		</nav>\n		\n		', '\n		<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/js/bootstrap.bundle.min.js" integrity="sha384-u1OknCvxWvY5kfmNBILK2hRnQC3Pr17a+RTT6rIHI7NnikvbZlHgTPOOmMi466C8" crossorigin="anonymous"><\/script>\n		<scrip src="/public/js/Galeria.js"></scrip>\n		\n		\n		<!--Footer -->\n		\n		<footer class="text-white bg-dark"> \n			\n			<div class="container-fluid ">\n				<div class="row p-5">\n					<hr>\n				<!--Fila logo -->\n					<div class="col-xs-12 col-md-2 col-lg-2"><img src="/public/logo-iconn.svg"></div>\n				<!-- fila correo -->\n					<div class="col-xs-12 col-md-4 col-lg-2">\n						<p class="correo text-center mt-2 mb-2">ma.mosquedapalato@hotmail.com</p>\n					</div>\n				<!--fila contenido -->\n					<div class="col-xs-12 col-md-3 col-lg-4">\n						<p class="h3 text-center">Content</p>\n						<div class="mb-2" style="text-align: center;"><a class="h6 text-secondary text-decoration-none" href="">Home</a></div>\n						<div class="mb-2" style="text-align: center;"><a class="h6 text-secondary text-decoration-none" href="">About</a></div>\n						<div class="mb-2" style="text-align: center;"><a class="h6 text-secondary text-decoration-none" href="">Work</a></div>\n						<div class="mb-2" style="text-align: center;"><a class="h6 text-secondary text-decoration-none" href="">Contact</a></div>\n					\n					</div>\n				<!--fila redes -->\n					<div class="col-xs-12 col-md-3 col-lg-4">\n						\n						<div class="row ">\n							<div class="col text-center">\n								<p class="h3 text-center">Social Media</p>\n							</div>\n						</div>\n							<div class="row ">\n								<div class="col text-end">\n									<a href="https://www.facebook.com/migueel.palatoo/">\n									<svg width="30" height="30" viewBox="0 0 251 249" fill="none" xmlns="http://www.w3.org/2000/svg">\n										<g clip-path="url(#clip0_411_2)">\n										<path d="M225.253 247.344H176.206C164.929 247.344 155.724 238.156 155.724 226.898V175.368C155.724 165.31 163.934 157.115 174.008 157.115H182.3C186.156 157.115 189.515 154.507 190.468 150.741L197.599 121.81H176.62C165.136 121.81 155.766 112.456 155.766 100.991V99.2109C155.766 89.1533 163.934 80.9995 174.008 80.9995H190.717C195.568 80.9995 199.548 77.0261 199.548 72.1835V52.8959C199.548 48.0534 195.568 44.08 190.717 44.08H157.383C136.984 44.08 120.359 60.6358 120.359 81.0409V98.3831C120.359 109.517 111.279 118.623 100.085 118.623H96.1047C93.8244 118.623 91.9587 120.485 91.9587 122.762V149.789C91.9587 152.065 93.8244 153.928 96.1047 153.928H105.433C115.467 153.928 123.593 162.04 123.593 172.057V226.112C123.593 237.866 114.016 247.386 102.282 247.386H101.121C97.2241 247.386 94.0732 244.24 94.0732 240.35C94.0732 236.459 97.2241 233.313 101.121 233.313H102.282C106.262 233.313 109.496 230.085 109.496 226.112V172.057C109.496 169.822 107.672 168.042 105.475 168.042H96.1462C86.0714 168.042 77.9037 159.847 77.9037 149.83V122.803C77.9037 112.745 86.1128 104.55 96.1462 104.55H100.126C103.526 104.55 106.262 101.818 106.262 98.4245V81.0823C106.262 52.9373 129.19 30.0489 157.383 30.0489H190.717C203.362 30.0489 213.686 40.3135 213.686 52.9787V72.2663C213.686 84.8901 203.404 95.1961 190.717 95.1961H174.008C171.728 95.1961 169.904 97.0587 169.904 99.2937V101.073C169.904 104.799 172.93 107.779 176.62 107.779H198.221C202.45 107.779 206.347 109.683 208.959 112.994C211.571 116.305 212.483 120.568 211.488 124.666L204.233 154.176C201.745 164.275 192.748 171.312 182.383 171.312H174.091C171.811 171.312 169.945 173.174 169.945 175.451V226.981C169.945 230.499 172.806 233.313 176.289 233.313H225.336C231.721 233.313 236.945 228.098 236.945 221.724V25.703C236.945 19.329 231.721 14.1139 225.336 14.1139H25.7468C19.3619 14.1139 14.1379 19.329 14.1379 25.703V221.641C14.1379 228.015 19.3619 233.231 25.7468 233.231H44.4039C48.3011 233.231 51.4521 236.376 51.4521 240.267C51.4521 244.157 48.3011 247.303 44.4039 247.303H25.7468C11.5674 247.303 0 235.797 0 221.6V25.703C0 11.5063 11.5259 0 25.7468 0H225.253C239.433 0 251 11.5063 251 25.703V221.641C251 235.797 239.474 247.344 225.253 247.344Z" fill="#FBC47B"></path>\n										<path d="M70.7725 249.041C74.9857 249.041 78.4012 245.632 78.4012 241.426C78.4012 237.22 74.9857 233.81 70.7725 233.81C66.5593 233.81 63.1439 237.22 63.1439 241.426C63.1439 245.632 66.5593 249.041 70.7725 249.041Z" fill="#FBC47B"></path>\n										</g>\n										<defs>\n										<clipPath id="clip0_411_2">\n										<rect width="251" height="249" fill="white"></rect>\n										</clipPath>\n										</defs>\n										</svg>\n									</a>\n								</div>\n									\n								<div class="col">\n									\n									<div class="col text-start mt-1"><a class="h6 text-mute text-secondary text-decoration-none" href="https://www.facebook.com/migueel.palatoo/">Facebook</a>\n								\n								</div>\n											\n							</div>\n					</div>\n							<div class="row mt-2">\n								<div class="col text-end">\n									<a href="https://www.instagram.com/miguel_palato/">\n									<svg width="30" height="30" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">\n										<g clip-path="url(#clip0_411_7)">\n										<path d="M44.99 0H16.42C15.5 0 14.68 0.67 14.59 1.59C14.49 2.64 15.31 3.52 16.34 3.52H44.99C50.55 3.52 55.06 8.03 55.06 13.59V45.09C55.06 50.65 50.55 55.16 44.99 55.16H15.35C7.91 55.16 3.52 50.65 3.52 45.09V18.93C3.52 17.96 2.73 17.17 1.76 17.17C0.79 17.17 0 17.96 0 18.93V45.09C0 52.6 5.74 58.68 15.35 58.68H44.99C52.5 58.68 58.58 52.59 58.58 45.09V13.59C58.58 6.09 52.5 0 44.99 0Z" fill="#FBC47B"></path>\n										<path d="M20.64 22.94C19.73 23.03 19.05 23.85 19.05 24.77V28.67C19.05 34.2 23.34 38.92 28.87 39.13C34.68 39.35 39.48 34.69 39.48 28.92V28.03C39.48 22.89 34.98 18.64 29.26 18.64H27.21C26.39 18.64 25.73 19.3 25.73 20.12V20.68C25.73 21.5 26.39 22.16 27.21 22.16H29.26C32.95 22.16 36.01 24.94 35.96 28.03V28.72C35.96 32.32 33.2 35.42 29.6 35.6C25.76 35.79 22.57 32.72 22.57 28.91V24.68C22.57 23.65 21.69 22.83 20.64 22.93V22.94Z" fill="#FBC47B"></path>\n										<path d="M38.01 8.33001H19.75C13.21 8.33001 7.90997 13.63 7.90997 20.17V35.96C7.90997 42.81 13.46 48.36 20.31 48.36H40.95C41.92 48.36 42.71 47.57 42.71 46.6C42.71 45.63 41.92 44.84 40.95 44.84H20.31C15.41 44.84 11.43 40.86 11.43 35.96V20.17C11.43 15.58 15.15 11.85 19.75 11.85H38.01C42.61 11.85 46.35 15.58 46.35 20.19V40.74C46.35 41.71 47.14 42.5 48.11 42.5C49.08 42.5 49.87 41.71 49.87 40.74V20.18C49.87 13.63 44.56 8.32001 38.01 8.32001V8.33001Z" fill="#FBC47B"></path>\n										<path d="M39.81 20.89C41.2956 20.89 42.5 19.6856 42.5 18.2C42.5 16.7143 41.2956 15.51 39.81 15.51C38.3244 15.51 37.12 16.7143 37.12 18.2C37.12 19.6856 38.3244 20.89 39.81 20.89Z" fill="#FBC47B"></path>\n										</g>\n										<defs>\n										<clipPath id="clip0_411_7">\n										<rect width="58.58" height="58.68" fill="white"></rect>\n										</clipPath>\n										</defs>\n									</svg>\n									</a>	\n								</div>\n									\n								<div class="col">\n									<div class="col text-start mt-1"><a class="h6 text-mute text-secondary text-decoration-none" href="https://www.instagram.com/miguel_palato/">Instagram</a>\n								</div>										\n							</div>\n\n						</div>\n						<div class="row mt-2">\n								<div class="col text-end">\n									<a href="https://www.linkedin.com/in/miguel-palato-6a677b158/">\n									<svg width="30" height="30" viewBox="0 0 64 61" fill="none" xmlns="http://www.w3.org/2000/svg">\n										<g clip-path="url(#clip0_411_15)">\n										<path d="M54.47 60.37H50.33C46.72 60.37 43.78 57.43 43.78 53.82V38.28C43.78 36.61 42.42 35.25 40.75 35.25H39.35C37.68 35.25 36.32 36.61 36.32 38.28V54.05C36.32 57.53 33.49 60.37 30 60.37H29.89C28.88 60.37 28.07 59.55 28.07 58.55C28.07 57.55 28.89 56.73 29.89 56.73H30C31.47 56.73 32.67 55.53 32.67 54.06V38.29C32.67 34.61 35.66 31.62 39.34 31.62H40.74C44.42 31.62 47.41 34.61 47.41 38.29V53.83C47.41 55.43 48.71 56.73 50.31 56.73H54.45C57.33 56.73 59.67 54.39 59.67 51.51V30.18C59.67 25.41 51.35 19.76 44.33 19.76C37.31 19.76 35.5 22.95 35.41 23.09L32.06 28.27L32.04 22.12C32.04 20.93 31.07 19.97 29.89 19.97H22.83C21.16 19.97 19.8 21.33 19.8 23V54.33C19.8 57.66 17.09 60.37 13.76 60.37H6.04C2.71 60.37 -4.59142e-07 57.66 -4.59142e-07 54.33V20.34C-0.0400005 19.82 0.14 19.28 0.49 18.82C1.23 17.87 2.84 16.9 9.23 16.9C11.82 16.9 13.7 16.24 14.84 14.95C16.51 13.05 16.17 10.25 16.17 10.22V10.05C16.12 9.4 15.67 3.64 9.81 3.64C7.52 3.64 5.86 4.22 4.85 5.36C3.38 7.04 3.66 9.51 3.66 9.53C3.79 10.53 3.09 11.44 2.09 11.57C1.09 11.7 0.18 11 0.0499995 10C0.0299995 9.83 -0.460001 5.88 2.11 2.95C3.85 1 6.44 0 9.82 0C14.78 0 17.25 2.75 18.46 5.06C19.59 7.23 19.77 9.34 19.8 9.83C19.88 10.51 20.18 14.39 17.62 17.33C15.76 19.47 12.94 20.55 9.24 20.55C5.86 20.55 4.31 20.85 3.65 21.04V54.33C3.65 55.65 4.72 56.72 6.04 56.72H13.78C15.1 56.72 16.17 55.65 16.17 54.33V23C16.17 19.32 19.16 16.33 22.84 16.33H29.9C31.88 16.33 33.62 17.32 34.67 18.83C36.52 17.5 39.59 16.12 44.34 16.12C52.71 16.12 63.33 22.74 63.33 30.19V51.5C63.33 56.39 59.35 60.37 54.46 60.37H54.47Z" fill="#FBC47B"></path>\n										<path d="M24.58 60.37C25.6293 60.37 26.48 59.5194 26.48 58.47C26.48 57.4207 25.6293 56.57 24.58 56.57C23.5307 56.57 22.68 57.4207 22.68 58.47C22.68 59.5194 23.5307 60.37 24.58 60.37Z" fill="#FBC47B"></path>\n										</g>\n										<defs>\n										<clipPath id="clip0_411_15">\n										<rect width="63.34" height="60.37" fill="white"></rect>\n										</clipPath>\n										</defs>\n										</svg>\n									</a>\n								</div>\n									\n							<div class="col">\n								<div class="col text-start mt-1"><a class="h6 text-mute text-secondary text-decoration-none" href="https://www.linkedin.com/in/miguel-palato-6a677b158/">Linkedin</a>\n								</div>										\n							</div>\n						</div>\n						\n									\n							\n					</div>\n						\n				</div>\n			</div>\n			\n	\n		\n		</footer>\n		\n		\n		\n\n    </body></html>'])), addAttribute(Astro2.generator, "content"), title, renderHead($$result), renderSlot($$result, $$slots["default"]));
});

const $$file$4 = "/Users/miguelpalato/Desktop/ProyectosDiseñoWeb/ProyectoFinalPagina/src/layouts/Layout.astro";
const $$url$4 = undefined;

const $$module1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$4,
  default: $$Layout,
  file: $$file$4,
  url: $$url$4
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata$3 = createMetadata("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/index.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$3 = createAstro("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/index.astro", "", "file:///Users/miguelpalato/Desktop/ProyectosDisen%CC%83oWeb/ProyectoFinalPagina/");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$Index;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`<head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
${renderHead($$result)}</head>

${renderComponent($$result, "Layout", $$Layout, { "title": "PalatoPage", "class": "astro-BIJNF7WK" }, { "default": () => renderTemplate`<main class="bg-white bg-opacity-10 astro-BIJNF7WK">
      <section class="astro-BIJNF7WK"> 
        <div class="video-container  astro-BIJNF7WK">
              <video src="/public/LogoAnimacion.mp4" autoplay loop muted poster="" class="astro-BIJNF7WK"></video>
       
        <div class=" astro-BIJNF7WK">
          <h3 class="position-absolute bottom-0 end-0 m-1 p-5 astro-BIJNF7WK">Graphic Designer / Web designer </h3>
        </div>
        </div>
        </section> 
      
     
        <section class="astro-BIJNF7WK">   
            <div class="container-fluid text-dark bg-white margen astro-BIJNF7WK" style="height:auto">
                <div class="row astro-BIJNF7WK">
                    <div class="col-lg-7 col-xs-12 example astro-BIJNF7WK"> 
                        <h1 class="display-1 text-center p-3 mt-5 animate_animated animate__fadeInLeft astro-BIJNF7WK">
                            About me
                        </h1>
                        <h4 class="text-muted text-center p-1  astro-BIJNF7WK">
                            I love desing and creating new things.
                        </h4>
                        <h6 class="text-center lh-base p-5 mb-5 lead astro-BIJNF7WK">I am a mexican designer, graduated from the University of
                            Guanajuato. I really like to play with desing but at the same time take into account the principles
                            and rules that exist in this. I like to invest my time in myself, in my physical and mental health.
                            I like to be prepared for any challenge that comes to me.
                        </h6>

                    </div>
                    <div class="col-lg-5 col-xs-12 p-2 astro-BIJNF7WK"> 
                    <img class="rounded-circle pt-3 mt-3 img-fluid astro-BIJNF7WK" src="/public/YONI.JPG" width="100%">
                    </div>
                </div>
            </div>
          
        </section>
        <section class="container-fluid p-0 bg-white  astro-BIJNF7WK">
            <div class="row p-2 mt-2 astro-BIJNF7WK">
                <div class="col-12 margen astro-BIJNF7WK">
                    <h2 class="display-1 text-end mx-5 px-5 astro-BIJNF7WK">
                         Projects
                    </h2>
                </div>
            </div>
        </section>

        <!-- Galeria -->

        <section class="p-5 m-3 astro-BIJNF7WK">
        <div id="carouselExampleCaptions" class="carousel slide astro-BIJNF7WK" data-bs-ride="carousel">
            <div class="carousel-indicators astro-BIJNF7WK">
              <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="0" class="active astro-BIJNF7WK" aria-current="true" aria-label="Slide 1"></button>
              <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="1" aria-label="Slide 2" class="astro-BIJNF7WK"></button>
              <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="2" aria-label="Slide 3" class="astro-BIJNF7WK"></button>
            </div>
            <div class="carousel-inner astro-BIJNF7WK">
              <div class="carousel-item active astro-BIJNF7WK">
                <img src="/public/EmporyHdGalery_1.png" class="d-block w-100 astro-BIJNF7WK" alt="...">
                <div class="carousel-caption d-none d-md-block shadow-lg p-3 mb-5 bg-body rounded astro-BIJNF7WK">
                  <h5 class="astro-BIJNF7WK">Empory</h5>
                  <p class="text-dark astro-BIJNF7WK">Branding for high-end product companies</p>
                </div>
              </div>
              <div class="carousel-item astro-BIJNF7WK">
                <img src="/public/saborMexicanoGalery.png" class="d-block w-100 astro-BIJNF7WK" alt="...">
                <div class="carousel-caption d-none d-md-block shadow-lg p-3 mb-5 bg-body rounded astro-BIJNF7WK">
                  <h5 class="astro-BIJNF7WK">Sabor Mexicano</h5>
                  <p class="text-dark astro-BIJNF7WK">Branding desing for Mexican food restaurant</p>
                </div>
              </div>
              <div class="carousel-item astro-BIJNF7WK">
                <img src="/public/EvexiaGalery.png" class="d-block w-100 astro-BIJNF7WK" alt="...">
                <div class="carousel-caption d-none d-md-block shadow-lg p-3 mb-5 bg-body rounded astro-BIJNF7WK">
                  <h5 class="astro-BIJNF7WK">Evexia Spa</h5>
                  <p class="text-dark astro-BIJNF7WK">Spa Branding desing in Irapuato</p>
                </div>
              </div>
            </div>
            <button class="carousel-control-prev astro-BIJNF7WK" type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide="prev">
              <span class="carousel-control-prev-icon astro-BIJNF7WK" aria-hidden="true"></span>
              <span class="visually-hidden astro-BIJNF7WK">Anterior</span>
            </button>
            <button class="carousel-control-next astro-BIJNF7WK" type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide="next">
              <span class="carousel-control-next-icon astro-BIJNF7WK" aria-hidden="true"></span>
              <span class="visually-hidden astro-BIJNF7WK">Siguiente</span>
            </button>
          </div>
        </section> 
        <section class="container-fluid p-0 bg-white  astro-BIJNF7WK">
          <div class="row p-5 mt-5 astro-BIJNF7WK">
              <div class="col-12 margen astro-BIJNF7WK">
                  <h2 class="display-2 text-center  astro-BIJNF7WK">
                    Dowloadable
                  </h2>
                  <a type="button" class="btn btn-dark boton astro-BIJNF7WK" href="/Iconos.ai.zip" role="button">Icons</a>
                    <hr class="px-5 astro-BIJNF7WK">
              </div>
          </div>
      </section>
    </main>` })}

`;
});

const $$file$3 = "/Users/miguelpalato/Desktop/ProyectosDiseñoWeb/ProyectoFinalPagina/src/pages/index.astro";
const $$url$3 = "";

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$3,
  default: $$Index,
  file: $$file$3,
  url: $$url$3
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(raw || cooked.slice()) }));
var _a$1;
const $$metadata$2 = createMetadata("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/proyectos.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$2 = createAstro("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/proyectos.astro", "", "file:///Users/miguelpalato/Desktop/ProyectosDisen%CC%83oWeb/ProyectoFinalPagina/");
const $$Proyectos = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Proyectos;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate(_a$1 || (_a$1 = __template$1(['<html lang="en" class="astro-I36HX5A4">\n  <head>\n    \n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">\n    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"><\/script>\n  ', "</head>\n  \n</html>\n", ""])), renderHead($$result), renderComponent($$result, "Layout", $$Layout, { "title": "proyectos", "class": "astro-I36HX5A4" }, { "default": () => renderTemplate`<body class="astro-I36HX5A4">

    
        <div class="row p-3 mt-5 astro-I36HX5A4">
             <div class="col-12 margen astro-I36HX5A4">
                 <h2 class="text-center astro-I36HX5A4" style="font-size: 50px;">Projects</h2>
            </div>
         </div>
    

        <div class="row m-5  astro-I36HX5A4">
            <div class="col-lg-4 col-md-4 mb-4 astro-I36HX5A4">
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage1" class="astro-I36HX5A4">
                    <img class="img-thumbnail mb-4 rounded astro-I36HX5A4" src="/public/moots2.1.png" alt="">
                </a>
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage2" class="astro-I36HX5A4">
                <img class="w-100 mb-4 rounded astro-I36HX5A4" src="/public/evexia1.png">
                </a>
            </div>
            <div class="col-lg-4 col-md-4 mb-4 astro-I36HX5A4">
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage3" class="astro-I36HX5A4">
                <img class="w-100 mb-4 rounded astro-I36HX5A4" src="/public/empory1.png">
                </a>    
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage4" class="astro-I36HX5A4">
                <img class="w-100 mb-4 rounded astro-I36HX5A4" src="/public/malpa2.png">
                </a>
            </div>
            <div class="col-lg-4 col-md-4 mb-4 astro-I36HX5A4">
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage5" class="astro-I36HX5A4">
                <img class="w-100 mb-4 rounded astro-I36HX5A4" src="/public/cocobongo2.png">
                </a>
                <a href="#!" data-bs-toggle="modal" data-bs-target="#modalImage6" class="astro-I36HX5A4">
                <img class="w-100 mb-4 rounded astro-I36HX5A4" src="/public/sabor1.png">
                </a>
            </div>
        
        </div>
 
<!--Modal -->
    <!--image1  -->
    <div tabindex="-1" aria-labelledby="modalImage1" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage1">
     <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
        <div class="modal-content astro-I36HX5A4">
        <img src="/public/moots1.png" alt="" class="astro-I36HX5A4">
        </div>
     </div>
    </div>  

    <!--image2  -->
    <div tabindex="-1" aria-labelledby="modalImage2" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage2">
     <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
        <div class="modal-content astro-I36HX5A4">
        <img src="/public//Evexialogo.png" alt="" class="astro-I36HX5A4">
        </div>
     </div>
    </div>  

     <!--image3 -->
    <div tabindex="-1" aria-labelledby="modalImage3" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage3">
     <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
        <div class="modal-content astro-I36HX5A4">
        <img src="/public/EmporyLogo.png" alt="" class="astro-I36HX5A4">
        </div>
     </div>
    
    </div>  

     <!--image4 -->
     <div tabindex="-1" aria-labelledby="modalImage4" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage4">
        <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
            <div class="modal-content astro-I36HX5A4">
            <img src="/public/LogoMalpa.png" alt="" class="astro-I36HX5A4">
        </div>
    </div>
 
 </div>  

  <!--image5-->
  <div tabindex="-1" aria-labelledby="modalImage5" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage5">
    <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
  <div class="modal-content astro-I36HX5A4">
  <img src="/public/logoAnimacion_Mesa de trabajo 1.png" alt="" class="astro-I36HX5A4">
  </div>
    </div>

    </div>  

 <!--image6 -->
 <div tabindex="-1" aria-labelledby="modalImage6" aria-hidden="true" class="modal fade astro-I36HX5A4" id="modalImage6">
    <div class="modal-dialog modal-lg modal-dialog-centered astro-I36HX5A4">
 <div class="modal-content astro-I36HX5A4">
 <img src="/public/SaborMexicanoLogoNegativo.png" alt="" class="astro-I36HX5A4">
 </div>
    </div>

    </div>  
  
   
</body>` }));
});

const $$file$2 = "/Users/miguelpalato/Desktop/ProyectosDiseñoWeb/ProyectoFinalPagina/src/pages/proyectos.astro";
const $$url$2 = "/proyectos";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$2,
  default: $$Proyectos,
  file: $$file$2,
  url: $$url$2
}, Symbol.toStringTag, { value: 'Module' }));

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$metadata$1 = createMetadata("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/contacto.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro$1 = createAstro("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/contacto.astro", "", "file:///Users/miguelpalato/Desktop/ProyectosDisen%CC%83oWeb/ProyectoFinalPagina/");
const $$Contacto = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Contacto;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Contacto", "class": "astro-AKTDDCJW" }, { "default": () => renderTemplate(_a || (_a = __template(["", '<main class="astro-AKTDDCJW">\n		\n		<!-- SECCI\xD3N DE FORMULARIO DE CONTACTO  -->\n		<section class="container mt-5 mb-5 pb-5 astro-AKTDDCJW">\n			<div class="row justify-content-center astro-AKTDDCJW">\n				<div class="col-lg-6  astro-AKTDDCJW">\n					\n					<form action="/data" id="Formulario" method="get" class="astro-AKTDDCJW">\n						<div class="my-3 astro-AKTDDCJW">\n							<label for="Nombre" class="formEtiquetas astro-AKTDDCJW">Name:</label>\n							<input type="text" name="nombre" class="form-control astro-AKTDDCJW" id="Nombre" placeholder="Enter your name" required>\n						</div>\n						<div class="my-3 astro-AKTDDCJW">\n							<label for="Correo" class="formEtiquetas astro-AKTDDCJW">Mail:</label>\n							<input type="email" name="correo" class="form-control astro-AKTDDCJW" id="Correo" placeholder="Enter email" required>\n						</div>\n						<div class="mb-3 astro-AKTDDCJW">\n							<label for="Tel" class="formEtiquetas astro-AKTDDCJW">Phone:</label>\n							<input type="tel" name="telefono" class="form-control astro-AKTDDCJW" id="Tel" placeholder="Phone (It is not a mandatory field)">\n						</div>\n\n						<div class="mb-3 astro-AKTDDCJW">\n							<label for="Mensaje" class="formEtiquetas astro-AKTDDCJW">Message:</label>\n							<textarea name="mensaje" class="form-control astro-AKTDDCJW" placeholder="Message" id="Mensaje" required></textarea>\n						</div>\n\n						<button type="submit" class="boton btn btn-danger astro-AKTDDCJW" name="enviar">\n							Send\n						</button>\n					</form>\n				</div>\n			</div>\n		</section>\n\n		<!-- MODAL DE CONFIRMACI\xD3N -->\n		<div class="modal fade astro-AKTDDCJW" id="modalFunciona" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">\n			<div class="modal-dialog astro-AKTDDCJW">\n				<div class="modal-content astro-AKTDDCJW">\n					<div class="modal-header astro-AKTDDCJW">\n						<h5 class="modal-title astro-AKTDDCJW" id="exampleModalLabel">\n							Send correctly\n						</h5>\n						<button type="button" class="btn-close astro-AKTDDCJW" data-bs-dismiss="modal" aria-label="Close"></button>\n					</div>\n					<div class="modal-body astro-AKTDDCJW">Your email application will then open to send the information</div>\n					<div class="modal-footer astro-AKTDDCJW">\n						<button type="button" class="btn btn-secondary astro-AKTDDCJW" data-bs-dismiss="modal">Understood</button>						\n					</div>\n				</div>\n			</div>\n		</div>\n		\n	</main><script>\n		window.addEventListener("DOMContentLoaded", (event) => {\n			const formulario = document.getElementById("Formulario");\n			formulario.addEventListener("submit", (event) => {\n				event.preventDefault();\n\n				const formData = new FormData(formulario);\n				var data = {};\n				for (var pair of formData.entries()) {\n					data = {...data, [pair[0]] : pair[1]}    				\n  				}			\n\n				const referencia =\n					"mailto:ma.mosquedapalato@hotmail.com?subject=Quiero%20contactar%20con%20el%20artista&body=Nombre:%20" +\n					data.nombre +\n					"%0D%0ACorreo:%20" +\n					data.correo +\n					"%0D%0ATelefono:%20" +\n					data.tel +\n					"%0D%0AMensaje:%20" +\n					data.mensaje;\n\n				const enlace = document.createElement("a");\n				enlace.href = referencia;\n				enlace.click();\n\n				const modalConfirmacion = new bootstrap.Modal(document.getElementById("modalFunciona"), {});				\n				modalConfirmacion.show();\n			});\n		});\n	<\/script>'])), maybeRenderHead($$result)) })}`;
});

const $$file$1 = "/Users/miguelpalato/Desktop/ProyectosDiseñoWeb/ProyectoFinalPagina/src/pages/contacto.astro";
const $$url$1 = "/contacto";

const _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata: $$metadata$1,
  default: $$Contacto,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$metadata = createMetadata("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/artista.astro", { modules: [{ module: $$module1, specifier: "../layouts/Layout.astro", assert: {} }], hydratedComponents: [], clientOnlyComponents: [], hydrationDirectives: /* @__PURE__ */ new Set([]), hoisted: [] });
const $$Astro = createAstro("/@fs/Users/miguelpalato/Desktop/ProyectosDisen\u0303oWeb/ProyectoFinalPagina/src/pages/artista.astro", "", "file:///Users/miguelpalato/Desktop/ProyectosDisen%CC%83oWeb/ProyectoFinalPagina/");
const $$Artista = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Artista;
  const STYLES = [];
  for (const STYLE of STYLES)
    $$result.styles.add(STYLE);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Artista", "class": "astro-WOMCBDIA" }, { "default": () => renderTemplate`${maybeRenderHead($$result)}<div class="container-fluid astro-WOMCBDIA">
        <div class="row astro-WOMCBDIA">
            <div class="col-12 pt-5 mt-5 astro-WOMCBDIA">
                <hr class="px-5 astro-WOMCBDIA">
                <h5 class="astro-WOMCBDIA">Hi, my name is</h5>
                <h1 class="display-1 mb-4 astro-WOMCBDIA">Miguel Angel Mosqueda Palato</h1>
                <h3 class="text-muted mb-5 astro-WOMCBDIA">I love desing and creating new things.</h3>

                <h5 class="mb-5 pb-5 astro-WOMCBDIA" style="padding-right: 35%;"> I am a digital artist focused on graphic
                    desing, as well as web desing (my intention is to create exceptional digital experiences).
                    I am currently focused on digital desing for brands.
                </h5>
            </div>
        </div> 
    </div><div class="container-fluid text-dark bg-white  astro-WOMCBDIA" style="height:auto">
        <div class="row astro-WOMCBDIA" style="padding-left: 12%;">
            <div class="col-lg-7 col-xs-12 example astro-WOMCBDIA"> 
                <h1 class="display-2 text-center p-3 mt-5 animate_animated animate__fadeInLeft astro-WOMCBDIA">
                    About me
                </h1>
                <h4 class="text-muted text-center p-1  astro-WOMCBDIA">
                    I love desing and creating new things.
                </h4>
                <h6 class="text-center lh-base p-5 mb-5 lead  astro-WOMCBDIA">Hello, my name is Miguel Angel Mosqueda Palat and 
                    I really enjoy creating content for the interne. My interest in desing began since I was a little
                    and grew as time went by.
                    Today I have had the opportunity to educate myself in a prestigiuos university in the area of digital
                    art. As well as being able to work as freelancer and create various projects focused on graphic desing.
                </h6>
            </div>
            <div class="col-lg-5 col-xs-12 p-2 astro-WOMCBDIA"> 
            <img class="rounded-circle pt-3 mt-3 img-fluid astro-WOMCBDIA" src="/public/YoHd.png" width="100%">
            </div>
        </div>
    </div><div class="container-fluid text-dark bg-white  astro-WOMCBDIA" style="height:auto">
        <div class="row astro-WOMCBDIA" style="padding-left: 12%;">
            <div class="col-lg-12 col-xs-12 astro-WOMCBDIA" style="padding-left: 15%;"> 
                <h2 class="display-3 text-end pl-5 mt-5 astro-WOMCBDIA">
                    Programs
                </h2>
                <h4 class="astro-WOMCBDIA">Adobe Ilustrator</h4>
                <div class="progress astro-WOMCBDIA" style="height: 25px;">
                    <div class="progress-bar bg-dark astro-WOMCBDIA" role="progressbar" style="width:90%" aria-valuenow="90" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <h4 class="astro-WOMCBDIA">Adobe InDesing</h4>
                <div class="progress astro-WOMCBDIA" style="height: 25px;">
                    <div class="progress-bar bg-dark astro-WOMCBDIA" role="progressbar" style="width: 80%" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <h4 class="astro-WOMCBDIA">Adobe Photoshop</h4>
                <div class="progress astro-WOMCBDIA" style="height: 25px;">
                    <div class="progress-bar bg-dark astro-WOMCBDIA" role="progressbar" style="width: 70%" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <h4 class="astro-WOMCBDIA">Adobe AfterEffects</h4>
                <div class="progress astro-WOMCBDIA" style="height: 25px;">
                    <div class="progress-bar bg-dark astro-WOMCBDIA" role="progressbar" style="width: 65%" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <h4 class="astro-WOMCBDIA">Unity</h4>
                <div class="progress astro-WOMCBDIA" style="height: 25px;">            
                    <div class="progress-bar bg-dark astro-WOMCBDIA" role="progressbar" style="width: 40%" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        </div>
    </div><div class="container-fluid astro-WOMCBDIA">
        <div class="row astro-WOMCBDIA">
            <div class="col-12 p-5 m-5 astro-WOMCBDIA">
                
                <h4 class="text-center astro-WOMCBDIA">What´s next?</h4>
                <h3 class="display-4 mb-4 text-center astro-WOMCBDIA">Get in Touch</h3>
                <h5 class="text-muted mb-5 text-center astro-WOMCBDIA">I am currently open to any opportunity to create multimedia content,
                    especially in the area of graphic desing and web desing, yo can contact me </h5> 
                    <a type="button" class="btn btn-dark boton astro-WOMCBDIA" href="/contacto" role="button">Contact me</a>
                    <hr class="px-5 astro-WOMCBDIA">
                
                   
                

            </div>
        </div> 
    </div>` })}`;
});

const $$file = "/Users/miguelpalato/Desktop/ProyectosDiseñoWeb/ProyectoFinalPagina/src/pages/artista.astro";
const $$url = "/artista";

const _page3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  $$metadata,
  default: $$Artista,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const pageMap = new Map([['src/pages/index.astro', _page0],['src/pages/proyectos.astro', _page1],['src/pages/contacto.astro', _page2],['src/pages/artista.astro', _page3],]);
const renderers = [Object.assign({"name":"astro:jsx","serverEntrypoint":"astro/jsx/server.js","jsxImportSource":"astro"}, { ssr: server_default }),];

export { pageMap, renderers };
