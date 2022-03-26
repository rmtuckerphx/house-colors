
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var swColors = [{code:"SW0001",name:"Mulberry Silk",r:148,g:118,b:108,hex:"94766C"},{code:"SW0002",name:"Chelsea Mauve",r:190,g:172,b:159,hex:"BEAC9F"},{code:"SW0003",name:"Cabbage Rose",r:197,g:159,b:145,hex:"C59F91"},{code:"SW0004",name:"Rose Brocade",r:153,g:108,b:110,hex:"996C6E"},{code:"SW0005",name:"Deepest Mauve",r:109,g:89,b:90,hex:"6D595A"},{code:"SW0006",name:"Toile Red",r:139,g:83,b:78,hex:"8B534E"},{code:"SW0007",name:"Decorous Amber",r:172,g:117,b:89,hex:"AC7559"},{code:"SW0008",name:"Cajun Red",r:141,g:66,b:47,hex:"8D422F"},{code:"SW0009",name:"Eastlake Gold",r:194,g:142,b:97,hex:"C28E61"},{code:"SW0010",name:"Wickerwork",r:193,g:158,b:128,hex:"C19E80"},{code:"SW0011",name:"Crewel Tan",r:203,g:185,b:155,hex:"CBB99B"},{code:"SW0012",name:"Empire Gold",r:193,g:159,b:110,hex:"C19F6E"},{code:"SW0013",name:"Majolica Green",r:174,g:176,b:143,hex:"AEB08F"},{code:"SW0014",name:"Sheraton Sage",r:143,g:134,b:102,hex:"8F8666"},{code:"SW0015",name:"Gallery Green",r:112,g:134,b:114,hex:"708672"},{code:"SW0016",name:"Billiard Green",r:69,g:88,b:77,hex:"45584D"},{code:"SW0017",name:"Calico",r:140,g:164,b:156,hex:"8CA49C"},{code:"SW0018",name:"Teal Stencil",r:98,g:127,b:123,hex:"627F7B"},{code:"SW0019",name:"Festoon Aqua",r:160,g:187,b:184,hex:"A0BBB8"},{code:"SW0020",name:"Peacock Plume",r:115,g:150,b:148,hex:"739694"},{code:"SW0021",name:"Queen Anne Lilac",r:192,g:182,b:180,hex:"C0B6B4"},{code:"SW0022",name:"Patchwork Plum",r:126,g:105,b:106,hex:"7E696A"},{code:"SW0023",name:"Pewter Tankard",r:163,g:155,b:144,hex:"A39B90"},{code:"SW0024",name:"Curio Gray",r:152,g:137,b:119,hex:"988977"},{code:"SW0025",name:"Rosedust",r:204,g:141,b:132,hex:"CC8D84"},{code:"SW0026",name:"Rachel Pink",r:232,g:185,b:174,hex:"E8B9AE"},{code:"SW0027",name:"Aristocrat Peach",r:236,g:206,b:185,hex:"ECCEB9"},{code:"SW0028",name:"Caen Stone",r:236,g:208,b:177,hex:"ECD0B1"},{code:"SW0029",name:"Acanthus",r:205,g:205,b:180,hex:"CDCDB4"},{code:"SW0030",name:"Colonial Yellow",r:239,g:196,b:136,hex:"EFC488"},{code:"SW0031",name:"Dutch Tile Blue",r:154,g:171,b:171,hex:"9AABAB"},{code:"SW0032",name:"Needlepoint Navy",r:84,g:102,b:112,hex:"546670"},{code:"SW0033",name:"Rembrandt Ruby",r:151,g:79,b:73,hex:"974F49"},{code:"SW0034",name:"Roycroft Rose",r:192,g:143,b:128,hex:"C08F80"},{code:"SW0035",name:"Warm Beige",r:238,g:218,b:195,hex:"EEDAC3"},{code:"SW0036",name:"Buckram Binding",r:217,g:195,b:166,hex:"D9C3A6"},{code:"SW0037",name:"Morris Room Grey",r:173,g:161,b:147,hex:"ADA193"},{code:"SW0038",name:"Library Pewter",r:127,g:114,b:99,hex:"7F7263"},{code:"SW0039",name:"Mellow Mauve",r:196,g:149,b:122,hex:"C4957A"},{code:"SW0040",name:"Roycroft Adobe",r:167,g:98,b:81,hex:"A76251"},{code:"SW0041",name:"Dard Hunter Green",r:58,g:74,b:63,hex:"3A4A3F"},{code:"SW0042",name:"Ruskin Room Green",r:172,g:161,b:125,hex:"ACA17D"},{code:"SW0043",name:"Peristyle Brass",r:174,g:144,b:94,hex:"AE905E"},{code:"SW0044",name:"Hubbard Squash",r:233,g:191,b:140,hex:"E9BF8C"},{code:"SW0045",name:"Antiquarian Brown",r:148,g:102,b:68,hex:"946644"},{code:"SW0046",name:"White Hyacinth",r:243,g:229,b:209,hex:"F3E5D1"},{code:"SW0047",name:"Studio Blue Green",r:109,g:129,b:123,hex:"6D817B"},{code:"SW0048",name:"Bunglehouse Blue",r:71,g:98,b:111,hex:"47626F"},{code:"SW0049",name:"Silver Gray",r:184,g:178,b:162,hex:"B8B2A2"},{code:"SW0050",name:"Classic Light Buff",r:240,g:234,b:220,hex:"F0EADC"},{code:"SW0051",name:"Classic Ivory",r:242,g:224,b:195,hex:"F2E0C3"},{code:"SW0052",name:"Pearl Gray",r:203,g:206,b:197,hex:"CBCEC5"},{code:"SW0053",name:"Porcelain",r:233,g:224,b:213,hex:"E9E0D5"},{code:"SW0054",name:"Twilight Gray",r:200,g:191,b:181,hex:"C8BFB5"},{code:"SW0055",name:"Light French Gray",r:194,g:192,b:187,hex:"C2C0BB"},{code:"SW0056",name:"Classic Sand",r:214,g:188,b:170,hex:"D6BCAA"},{code:"SW0057",name:"Chinese Red",r:158,g:62,b:51,hex:"9E3E33"},{code:"SW0058",name:"Jazz Age Coral",r:241,g:191,b:177,hex:"F1BFB1"},{code:"SW0059",name:"Frostwork",r:203,g:208,b:194,hex:"CBD0C2"},{code:"SW0060",name:"Alexandrite",r:89,g:140,b:116,hex:"598C74"},{code:"SW0061",name:"Salon Rose",r:171,g:120,b:120,hex:"AB7878"},{code:"SW0062",name:"Studio Mauve",r:198,g:185,b:184,hex:"C6B9B8"},{code:"SW0063",name:"Blue Sky",r:171,g:209,b:201,hex:"ABD1C9"},{code:"SW0064",name:"Blue Peacock",r:1,g:78,b:76,hex:"014E4C"},{code:"SW0065",name:"Vogue Green",r:75,g:86,b:69,hex:"4B5645"},{code:"SW0066",name:"Cascade Green",r:172,g:177,b:159,hex:"ACB19F"},{code:"SW0067",name:"Belvedere Cream",r:240,g:205,b:160,hex:"F0CDA0"},{code:"SW0068",name:"Copen Blue",r:194,g:204,b:196,hex:"C2CCC4"},{code:"SW0069",name:"Rose Tan",r:205,g:156,b:133,hex:"CD9C85"},{code:"SW0070",name:"Pink Shadow",r:222,g:195,b:185,hex:"DEC3B9"},{code:"SW0071",name:"Orchid",r:188,g:156,b:158,hex:"BC9C9E"},{code:"SW0072",name:"Deep Maroon",r:98,g:63,b:69,hex:"623F45"},{code:"SW0073",name:"Chartreuse",r:225,g:210,b:134,hex:"E1D286"},{code:"SW0074",name:"Radiant Lilac",r:164,g:137,b:160,hex:"A489A0"},{code:"SW0075",name:"Holiday Turquoise",r:138,g:198,b:189,hex:"8AC6BD"},{code:"SW0076",name:"Appleblossom",r:218,g:181,b:180,hex:"DAB5B4"},{code:"SW0077",name:"Classic French Gray",r:136,g:135,b:130,hex:"888782"},{code:"SW0078",name:"Sunbeam Yellow",r:240,g:211,b:157,hex:"F0D39D"},{code:"SW0079",name:"Pinky Beige",r:201,g:170,b:152,hex:"C9AA98"},{code:"SW0080",name:"Pink Flamingo",r:205,g:113,b:123,hex:"CD717B"},{code:"SW1015",name:"Skyline Steel",r:198,g:191,b:179,hex:"C6BFB3"},{code:"SW1666",name:"Venetian Yellow",r:246,g:227,b:161,hex:"F6E3A1"},{code:"SW1667",name:"Icy Lemonade",r:244,g:232,b:178,hex:"F4E8B2"},{code:"SW1668",name:"Pineapple Cream",r:242,g:234,b:195,hex:"F2EAC3"},{code:"SW2704",name:"Merlot",r:81,g:50,b:59,hex:"51323B"},{code:"SW2735",name:"Rockweed",r:68,g:55,b:53,hex:"443735"},{code:"SW2739",name:"Charcoal Blue",r:61,g:68,b:80,hex:"3D4450"},{code:"SW2740",name:"Mineral Gray",r:81,g:87,b:99,hex:"515763"},{code:"SW2801",name:"Rookwood Dark Red",r:75,g:41,b:41,hex:"4B2929"},{code:"SW2802",name:"Rookwood Red",r:98,g:47,b:45,hex:"622F2D"},{code:"SW2803",name:"Rookwood Terra Cotta",r:151,g:88,b:64,hex:"975840"},{code:"SW2804",name:"Renwick Rose Beige",r:175,g:136,b:113,hex:"AF8871"},{code:"SW2805",name:"Renwick Beige",r:195,g:176,b:157,hex:"C3B09D"},{code:"SW2806",name:"Rookwood Brown",r:127,g:97,b:74,hex:"7F614A"},{code:"SW2807",name:"Rookwood Medium Brown",r:110,g:82,b:65,hex:"6E5241"},{code:"SW2808",name:"Rookwood Dark Brown",r:95,g:77,b:67,hex:"5F4D43"},{code:"SW2809",name:"Rookwood Shutter Green",r:48,g:59,b:57,hex:"303B39"},{code:"SW2810",name:"Rookwood Sash Green",r:80,g:106,b:103,hex:"506A67"},{code:"SW2811",name:"Rookwood Blue Green",r:115,g:132,b:120,hex:"738478"},{code:"SW2812",name:"Rookwood Jade",r:151,g:159,b:127,hex:"979F7F"},{code:"SW2813",name:"Downing Straw",r:202,g:171,b:125,hex:"CAAB7D"},{code:"SW2814",name:"Rookwood Antique Gold",r:165,g:130,b:88,hex:"A58258"},{code:"SW2815",name:"Renwick Olive",r:151,g:137,b:106,hex:"97896A"},{code:"SW2816",name:"Rookwood Dark Green",r:86,g:92,b:74,hex:"565C4A"},{code:"SW2817",name:"Rookwood Amber",r:192,g:134,b:80,hex:"C08650"},{code:"SW2818",name:"Renwick Heather",r:139,g:125,b:123,hex:"8B7D7B"},{code:"SW2819",name:"Downing Slate",r:119,g:127,b:134,hex:"777F86"},{code:"SW2820",name:"Downing Earth",r:136,g:123,b:103,hex:"887B67"},{code:"SW2821",name:"Downing Stone",r:166,g:163,b:151,hex:"A6A397"},{code:"SW2822",name:"Downing Sand",r:203,g:188,b:165,hex:"CBBCA5"},{code:"SW2823",name:"Rookwood Clay",r:154,g:126,b:100,hex:"9A7E64"},{code:"SW2824",name:"Renwick Golden Oak",r:150,g:114,b:76,hex:"96724C"},{code:"SW2826",name:"Colonial Revival Green Stone",r:163,g:155,b:126,hex:"A39B7E"},{code:"SW2827",name:"Colonial Revival Stone",r:167,g:148,b:124,hex:"A7947C"},{code:"SW2828",name:"Colonial Revival Tan",r:211,g:182,b:153,hex:"D3B699"},{code:"SW2829",name:"Classical White",r:236,g:225,b:203,hex:"ECE1CB"},{code:"SW2831",name:"Classical Gold",r:235,g:184,b:117,hex:"EBB875"},{code:"SW2832",name:"Colonial Revival Gray",r:180,g:185,b:185,hex:"B4B9B9"},{code:"SW2833",name:"Roycroft Vellum",r:232,g:217,b:189,hex:"E8D9BD"},{code:"SW2834",name:"Birdseye Maple",r:228,g:196,b:149,hex:"E4C495"},{code:"SW2835",name:"Craftsman Brown",r:174,g:146,b:120,hex:"AE9278"},{code:"SW2836",name:"Quartersawn Oak",r:133,g:105,b:91,hex:"85695B"},{code:"SW2837",name:"Aurora Brown",r:106,g:66,b:56,hex:"6A4238"},{code:"SW2838",name:"Polished Mahogany",r:67,g:39,b:34,hex:"432722"},{code:"SW2839",name:"Roycroft Copper Red",r:123,g:55,b:40,hex:"7B3728"},{code:"SW2840",name:"Hammered Silver",r:151,g:138,b:127,hex:"978A7F"},{code:"SW2841",name:"Weathered Shingle",r:147,g:127,b:104,hex:"937F68"},{code:"SW2842",name:"Roycroft Suede",r:167,g:148,b:115,hex:"A79473"},{code:"SW2843",name:"Roycroft Brass",r:122,g:106,b:81,hex:"7A6A51"},{code:"SW2844",name:"Roycroft Mist Gray",r:194,g:189,b:177,hex:"C2BDB1"},{code:"SW2845",name:"Bunglehouse Gray",r:152,g:143,b:123,hex:"988F7B"},{code:"SW2846",name:"Roycroft Bronze Green",r:87,g:84,b:73,hex:"575449"},{code:"SW2847",name:"Roycroft Bottle Green",r:50,g:64,b:56,hex:"324038"},{code:"SW2848",name:"Roycroft Pewter",r:97,g:101,b:100,hex:"616564"},{code:"SW2849",name:"Westchester Gray",r:121,g:121,b:120,hex:"797978"},{code:"SW2850",name:"Chelsea Gray",r:182,g:183,b:176,hex:"B6B7B0"},{code:"SW2851",name:"Sage Green Light",r:115,g:112,b:94,hex:"73705E"},{code:"SW2853",name:"New Colonial Yellow",r:217,g:173,b:127,hex:"D9AD7F"},{code:"SW2854",name:"Caribbean Coral",r:190,g:121,b:94,hex:"BE795E"},{code:"SW2855",name:"Sycamore Tan",r:156,g:138,b:121,hex:"9C8A79"},{code:"SW2856",name:"Fairfax Brown",r:97,g:70,b:58,hex:"61463A"},{code:"SW2857",name:"Peace Yellow",r:238,g:207,b:158,hex:"EECF9E"},{code:"SW2858",name:"Harvest Gold",r:217,g:160,b:106,hex:"D9A06A"},{code:"SW2859",name:"Beige",r:223,g:200,b:181,hex:"DFC8B5"},{code:"SW2860",name:"Sage",r:179,g:174,b:149,hex:"B3AE95"},{code:"SW2861",name:"Avocado",r:133,g:124,b:93,hex:"857C5D"},{code:"SW2863",name:"Powder Blue",r:137,g:164,b:173,hex:"89A4AD"},{code:"SW2865",name:"Classical Yellow",r:248,g:212,b:146,hex:"F8D492"},{code:"SW6000",name:"Snowfall",r:224,g:222,b:218,hex:"E0DEDA"},{code:"SW6001",name:"Grayish",r:207,g:202,b:199,hex:"CFCAC7"},{code:"SW6002",name:"Essential Gray",r:188,g:184,b:182,hex:"BCB8B6"},{code:"SW6003",name:"Proper Gray",r:173,g:168,b:165,hex:"ADA8A5"},{code:"SW6004",name:"Mink",r:132,g:123,b:119,hex:"847B77"},{code:"SW6005",name:"Folkstone",r:109,g:101,b:98,hex:"6D6562"},{code:"SW6006",name:"Black Bean",r:64,g:51,b:48,hex:"403330"},{code:"SW6007",name:"Smart White",r:228,g:219,b:216,hex:"E4DBD8"},{code:"SW6008",name:"Individual White",r:212,g:205,b:202,hex:"D4CDCA"},{code:"SW6009",name:"Imagine",r:194,g:182,b:182,hex:"C2B6B6"},{code:"SW6010",name:"Flexible Gray",r:177,g:163,b:161,hex:"B1A3A1"},{code:"SW6011",name:"Chinchilla",r:134,g:120,b:117,hex:"867875"},{code:"SW6012",name:"Browse Brown",r:110,g:97,b:95,hex:"6E615F"},{code:"SW6013",name:"Bitter Chocolate",r:77,g:60,b:60,hex:"4D3C3C"},{code:"SW6015",name:"Vaguely Mauve",r:209,g:197,b:196,hex:"D1C5C4"},{code:"SW6016",name:"Chaise Mauve",r:193,g:178,b:179,hex:"C1B2B3"},{code:"SW6017",name:"Intuitive",r:179,g:163,b:165,hex:"B3A3A5"},{code:"SW6018",name:"Enigma",r:139,g:124,b:126,hex:"8B7C7E"},{code:"SW6019",name:"Poetry Plum",r:111,g:92,b:95,hex:"6F5C5F"},{code:"SW6020",name:"Marooned",r:78,g:49,b:50,hex:"4E3132"},{code:"SW6021",name:"Dreamy White",r:227,g:217,b:213,hex:"E3D9D5"},{code:"SW6022",name:"Breathless",r:214,g:194,b:190,hex:"D6C2BE"},{code:"SW6023",name:"Insightful Rose",r:201,g:176,b:171,hex:"C9B0AB"},{code:"SW6024",name:"Dressy Rose",r:184,g:157,b:154,hex:"B89D9A"},{code:"SW6025",name:"Socialite",r:144,g:118,b:118,hex:"907676"},{code:"SW6026",name:"River Rouge",r:118,g:89,b:93,hex:"76595D"},{code:"SW6027",name:"Cordovan",r:95,g:61,b:63,hex:"5F3D3F"},{code:"SW6028",name:"Cultured Pearl",r:229,g:220,b:214,hex:"E5DCD6"},{code:"SW6029",name:"White Truffle",r:215,g:200,b:194,hex:"D7C8C2"},{code:"SW6030",name:"Artistic Taupe",r:195,g:177,b:172,hex:"C3B1AC"},{code:"SW6031",name:"Glamour",r:182,g:160,b:154,hex:"B6A09A"},{code:"SW6032",name:"Dutch Cocoa",r:140,g:112,b:106,hex:"8C706A"},{code:"SW6033",name:"Bateau Brown",r:122,g:95,b:90,hex:"7A5F5A"},{code:"SW6034",name:"Dark Auburn",r:90,g:53,b:50,hex:"5A3532"},{code:"SW6035",name:"Gauzy White",r:227,g:219,b:212,hex:"E3DBD4"},{code:"SW6036",name:"Angora",r:209,g:197,b:190,hex:"D1C5BE"},{code:"SW6037",name:"Temperate Taupe",r:191,g:177,b:170,hex:"BFB1AA"},{code:"SW6038",name:"Truly Taupe",r:172,g:158,b:151,hex:"AC9E97"},{code:"SW6039",name:"Poised Taupe",r:140,g:126,b:120,hex:"8C7E78"},{code:"SW6040",name:"Nutshell",r:117,g:103,b:97,hex:"756761"},{code:"SW6041",name:"Otter",r:86,g:67,b:59,hex:"56433B"},{code:"SW6042",name:"Hush White",r:229,g:218,b:212,hex:"E5DAD4"},{code:"SW6043",name:"Unfussy Beige",r:214,g:200,b:192,hex:"D6C8C0"},{code:"SW6044",name:"Doeskin",r:198,g:179,b:169,hex:"C6B3A9"},{code:"SW6045",name:"Emerging Taupe",r:184,g:161,b:150,hex:"B8A196"},{code:"SW6046",name:"Swing Brown",r:148,g:117,b:105,hex:"947569"},{code:"SW6047",name:"Hot Cocoa",r:128,g:98,b:87,hex:"806257"},{code:"SW6048",name:"Terra Brun",r:90,g:56,b:45,hex:"5A382D"},{code:"SW6049",name:"Gorgeous White",r:231,g:219,b:211,hex:"E7DBD3"},{code:"SW6050",name:"Abalone Shell",r:219,g:199,b:189,hex:"DBC7BD"},{code:"SW6051",name:"Sashay Sand",r:207,g:180,b:168,hex:"CFB4A8"},{code:"SW6052",name:"Sandbank",r:195,g:164,b:151,hex:"C3A497"},{code:"SW6053",name:"Reddened Earth",r:156,g:110,b:99,hex:"9C6E63"},{code:"SW6054",name:"Canyon Clay",r:133,g:89,b:79,hex:"85594F"},{code:"SW6055",name:"Fiery Brown",r:93,g:56,b:49,hex:"5D3831"},{code:"SW6056",name:"Polite White",r:233,g:221,b:212,hex:"E9DDD4"},{code:"SW6057",name:"Malted Milk",r:222,g:202,b:189,hex:"DECABD"},{code:"SW6058",name:"Likeable Sand",r:209,g:183,b:168,hex:"D1B7A8"},{code:"SW6059",name:"Interface Tan",r:193,g:163,b:146,hex:"C1A392"},{code:"SW6060",name:"Moroccan Spice",r:157,g:120,b:104,hex:"9D7868"},{code:"SW6061",name:"Tanbark",r:137,g:102,b:86,hex:"896656"},{code:"SW6062",name:"Vintage Leather",r:105,g:67,b:54,hex:"694336"},{code:"SW6063",name:"Nice White",r:230,g:221,b:213,hex:"E6DDD5"},{code:"SW6064",name:"Reticence",r:217,g:205,b:195,hex:"D9CDC3"},{code:"SW6065",name:"Bona Fide Beige",r:203,g:185,b:171,hex:"CBB9AB"},{code:"SW6066",name:"Sand Trap",r:187,g:165,b:149,hex:"BBA595"},{code:"SW6067",name:"Mocha",r:150,g:122,b:106,hex:"967A6A"},{code:"SW6068",name:"Brevity Brown",r:113,g:82,b:67,hex:"715243"},{code:"SW6069",name:"French Roast",r:79,g:52,b:38,hex:"4F3426"},{code:"SW6070",name:"Heron Plume",r:229,g:225,b:216,hex:"E5E1D8"},{code:"SW6071",name:"Popular Gray",r:212,g:204,b:195,hex:"D4CCC3"},{code:"SW6072",name:"Versatile Gray",r:193,g:182,b:171,hex:"C1B6AB"},{code:"SW6073",name:"Perfect Greige",r:183,g:171,b:159,hex:"B7AB9F"},{code:"SW6074",name:"Spalding Gray",r:141,g:127,b:117,hex:"8D7F75"},{code:"SW6075",name:"Garret Gray",r:117,g:104,b:97,hex:"756861"},{code:"SW6076",name:"Turkish Coffee",r:77,g:57,b:48,hex:"4D3930"},{code:"SW6077",name:"Everyday White",r:228,g:220,b:212,hex:"E4DCD4"},{code:"SW6078",name:"Realist Beige",r:211,g:200,b:189,hex:"D3C8BD"},{code:"SW6079",name:"Diverse Beige",r:194,g:180,b:167,hex:"C2B4A7"},{code:"SW6080",name:"Utterly Beige",r:181,g:165,b:151,hex:"B5A597"},{code:"SW6081",name:"Down Home",r:144,g:120,b:101,hex:"907865"},{code:"SW6082",name:"Cobble Brown",r:122,g:100,b:85,hex:"7A6455"},{code:"SW6083",name:"Sable",r:95,g:75,b:63,hex:"5F4B3F"},{code:"SW6084",name:"Modest White",r:230,g:221,b:212,hex:"E6DDD4"},{code:"SW6085",name:"Simplify Beige",r:214,g:199,b:185,hex:"D6C7B9"},{code:"SW6086",name:"Sand Dune",r:197,g:177,b:162,hex:"C5B1A2"},{code:"SW6087",name:"Trusty Tan",r:181,g:159,b:143,hex:"B59F8F"},{code:"SW6088",name:"Nuthatch",r:142,g:114,b:95,hex:"8E725F"},{code:"SW6089",name:"Grounded",r:120,g:91,b:71,hex:"785B47"},{code:"SW6090",name:"Java",r:99,g:69,b:51,hex:"634533"},{code:"SW6091",name:"Reliable White",r:232,g:222,b:211,hex:"E8DED3"},{code:"SW6092",name:"Lightweight Beige",r:218,g:200,b:184,hex:"DAC8B8"},{code:"SW6093",name:"Familiar Beige",r:202,g:179,b:160,hex:"CAB3A0"},{code:"SW6094",name:"Sensational Sand",r:191,g:163,b:141,hex:"BFA38D"},{code:"SW6095",name:"Toasty",r:149,g:114,b:88,hex:"957258"},{code:"SW6096",name:"Jute Brown",r:129,g:93,b:64,hex:"815D40"},{code:"SW6097",name:"Sturdy Brown",r:105,g:72,b:44,hex:"69482C"},{code:"SW6098",name:"Pacer White",r:229,g:221,b:208,hex:"E5DDD0"},{code:"SW6099",name:"Sand Dollar",r:215,g:197,b:179,hex:"D7C5B3"},{code:"SW6100",name:"Practical Beige",r:201,g:178,b:156,hex:"C9B29C"},{code:"SW6101",name:"Sands of Time",r:188,g:163,b:139,hex:"BCA38B"},{code:"SW6102",name:"Portabello",r:148,g:122,b:98,hex:"947A62"},{code:"SW6103",name:"Tea Chest",r:125,g:100,b:77,hex:"7D644D"},{code:"SW6104",name:"Kaffee",r:101,g:80,b:61,hex:"65503D"},{code:"SW6105",name:"Divine White",r:230,g:220,b:205,hex:"E6DCCD"},{code:"SW6106",name:"Kilim Beige",r:215,g:197,b:174,hex:"D7C5AE"},{code:"SW6107",name:"Nomadic Desert",r:199,g:177,b:152,hex:"C7B198"},{code:"SW6108",name:"Latte",r:186,g:161,b:133,hex:"BAA185"},{code:"SW6109",name:"Hopsack",r:158,g:129,b:99,hex:"9E8163"},{code:"SW6110",name:"Steady Brown",r:138,g:107,b:77,hex:"8A6B4D"},{code:"SW6111",name:"Coconut Husk",r:112,g:87,b:63,hex:"70573F"},{code:"SW6112",name:"Biscuit",r:235,g:221,b:203,hex:"EBDDCB"},{code:"SW6113",name:"Interactive Cream",r:228,g:202,b:173,hex:"E4CAAD"},{code:"SW6114",name:"Bagel",r:215,g:181,b:147,hex:"D7B593"},{code:"SW6115",name:"Totally Tan",r:204,g:166,b:131,hex:"CCA683"},{code:"SW6116",name:"Tatami Tan",r:186,g:140,b:100,hex:"BA8C64"},{code:"SW6117",name:"Smokey Topaz",r:165,g:121,b:85,hex:"A57955"},{code:"SW6118",name:"Leather Bound",r:141,g:98,b:61,hex:"8D623D"},{code:"SW6119",name:"Antique White",r:232,g:220,b:198,hex:"E8DCC6"},{code:"SW6120",name:"Believable Buff",r:219,g:199,b:168,hex:"DBC7A8"},{code:"SW6121",name:"Whole Wheat",r:205,g:181,b:146,hex:"CDB592"},{code:"SW6122",name:"Camelback",r:197,g:170,b:133,hex:"C5AA85"},{code:"SW6123",name:"Baguette",r:179,g:145,b:103,hex:"B39167"},{code:"SW6124",name:"Cardboard",r:156,g:122,b:86,hex:"9C7A56"},{code:"SW6125",name:"Craft Paper",r:138,g:102,b:69,hex:"8A6645"},{code:"SW6126",name:"Navajo White",r:233,g:220,b:198,hex:"E9DCC6"},{code:"SW6127",name:"Ivoire",r:228,g:206,b:172,hex:"E4CEAC"},{code:"SW6128",name:"Blonde",r:220,g:189,b:146,hex:"DCBD92"},{code:"SW6129",name:"Restrained Gold",r:210,g:176,b:132,hex:"D2B084"},{code:"SW6130",name:"Mannered Gold",r:193,g:151,b:99,hex:"C19763"},{code:"SW6131",name:"Chamois",r:173,g:132,b:81,hex:"AD8451"},{code:"SW6132",name:"Relic Bronze",r:144,g:106,b:58,hex:"906A3A"},{code:"SW6133",name:"Muslin",r:234,g:223,b:201,hex:"EADFC9"},{code:"SW6134",name:"Netsuke",r:224,g:207,b:176,hex:"E0CFB0"},{code:"SW6135",name:"Ecru",r:208,g:186,b:148,hex:"D0BA94"},{code:"SW6136",name:"Harmonic Tan",r:198,g:176,b:138,hex:"C6B08A"},{code:"SW6137",name:"Burlap",r:172,g:149,b:113,hex:"AC9571"},{code:"SW6138",name:"Artifact",r:154,g:129,b:94,hex:"9A815E"},{code:"SW6139",name:"Mossy Gold",r:127,g:103,b:67,hex:"7F6743"},{code:"SW6140",name:"Moderate White",r:233,g:222,b:207,hex:"E9DECF"},{code:"SW6141",name:"Softer Tan",r:218,g:202,b:178,hex:"DACAB2"},{code:"SW6142",name:"Macadamia",r:204,g:183,b:155,hex:"CCB79B"},{code:"SW6143",name:"Basket Beige",r:192,g:169,b:139,hex:"C0A98B"},{code:"SW6144",name:"Dapper Tan",r:148,g:127,b:101,hex:"947F65"},{code:"SW6145",name:"Thatch Brown",r:134,g:112,b:87,hex:"867057"},{code:"SW6146",name:"Umber",r:110,g:84,b:60,hex:"6E543C"},{code:"SW6147",name:"Panda White",r:234,g:226,b:212,hex:"EAE2D4"},{code:"SW6148",name:"Wool Skein",r:217,g:207,b:186,hex:"D9CFBA"},{code:"SW6149",name:"Relaxed Khaki",r:200,g:187,b:163,hex:"C8BBA3"},{code:"SW6150",name:"Universal Khaki",r:184,g:169,b:146,hex:"B8A992"},{code:"SW6151",name:"Quiver Tan",r:142,g:127,b:106,hex:"8E7F6A"},{code:"SW6152",name:"Superior Bronze",r:120,g:105,b:87,hex:"786957"},{code:"SW6153",name:"Prot�g� Bronze",r:102,g:84,b:62,hex:"66543E"},{code:"SW6154",name:"Nacre",r:232,g:226,b:212,hex:"E8E2D4"},{code:"SW6155",name:"Rice Grain",r:219,g:208,b:185,hex:"DBD0B9"},{code:"SW6156",name:"Ramie",r:205,g:189,b:162,hex:"CDBDA2"},{code:"SW6157",name:"Favorite Tan",r:193,g:174,b:145,hex:"C1AE91"},{code:"SW6158",name:"Sawdust",r:153,g:137,b:112,hex:"998970"},{code:"SW6159",name:"High Tea",r:126,g:111,b:89,hex:"7E6F59"},{code:"SW6160",name:"Best Bronze",r:93,g:81,b:62,hex:"5D513E"},{code:"SW6161",name:"Nonchalant White",r:222,g:221,b:209,hex:"DEDDD1"},{code:"SW6162",name:"Ancient Marble",r:209,g:204,b:185,hex:"D1CCB9"},{code:"SW6163",name:"Grassland",r:193,g:188,b:167,hex:"C1BCA7"},{code:"SW6164",name:"Svelte Sage",r:178,g:172,b:150,hex:"B2AC96"},{code:"SW6165",name:"Connected Gray",r:137,g:132,b:115,hex:"898473"},{code:"SW6166",name:"Eclipse",r:107,g:103,b:87,hex:"6B6757"},{code:"SW6167",name:"Garden Gate",r:94,g:89,b:73,hex:"5E5949"},{code:"SW6168",name:"Moderne White",r:226,g:224,b:215,hex:"E2E0D7"},{code:"SW6169",name:"Sedate Gray",r:209,g:205,b:191,hex:"D1CDBF"},{code:"SW6170",name:"Techno Gray",r:191,g:185,b:170,hex:"BFB9AA"},{code:"SW6171",name:"Chatroom",r:176,g:171,b:156,hex:"B0AB9C"},{code:"SW6172",name:"Hardware",r:139,g:131,b:114,hex:"8B8372"},{code:"SW6173",name:"Cocoon",r:114,g:107,b:91,hex:"726B5B"},{code:"SW6174",name:"Andiron",r:66,g:64,b:54,hex:"424036"},{code:"SW6175",name:"Sagey",r:226,g:226,b:209,hex:"E2E2D1"},{code:"SW6176",name:"Liveable Green",r:206,g:206,b:189,hex:"CECEBD"},{code:"SW6177",name:"Softened Green",r:187,g:188,b:167,hex:"BBBCA7"},{code:"SW6178",name:"Clary Sage",r:172,g:173,b:151,hex:"ACAD97"},{code:"SW6179",name:"Artichoke",r:127,g:130,b:102,hex:"7F8266"},{code:"SW6180",name:"Oakmoss",r:101,g:104,b:76,hex:"65684C"},{code:"SW6181",name:"Secret Garden",r:79,g:82,b:58,hex:"4F523A"},{code:"SW6182",name:"Ethereal White",r:227,g:226,b:217,hex:"E3E2D9"},{code:"SW6183",name:"Conservative Gray",r:209,g:208,b:198,hex:"D1D0C6"},{code:"SW6184",name:"Austere Gray",r:190,g:191,b:178,hex:"BEBFB2"},{code:"SW6185",name:"Escape Gray",r:171,g:172,b:159,hex:"ABAC9F"},{code:"SW6186",name:"Dried Thyme",r:123,g:128,b:112,hex:"7B8070"},{code:"SW6187",name:"Rosemary",r:100,g:105,b:92,hex:"64695C"},{code:"SW6188",name:"Shade-Grown",r:78,g:81,b:71,hex:"4E5147"},{code:"SW6189",name:"Opaline",r:220,g:223,b:215,hex:"DCDFD7"},{code:"SW6190",name:"Filmy Green",r:209,g:211,b:199,hex:"D1D3C7"},{code:"SW6191",name:"Contented",r:189,g:192,b:179,hex:"BDC0B3"},{code:"SW6192",name:"Coastal Plain",r:159,g:166,b:148,hex:"9FA694"},{code:"SW6193",name:"Privilege Green",r:122,g:135,b:117,hex:"7A8775"},{code:"SW6194",name:"Basil",r:98,g:110,b:96,hex:"626E60"},{code:"SW6195",name:"Rock Garden",r:70,g:84,b:72,hex:"465448"},{code:"SW6196",name:"Frosty White",r:221,g:221,b:214,hex:"DDDDD6"},{code:"SW6197",name:"Aloof Gray",r:201,g:201,b:192,hex:"C9C9C0"},{code:"SW6198",name:"Sensible Hue",r:182,g:181,b:171,hex:"B6B5AB"},{code:"SW6199",name:"Rare Gray",r:166,g:166,b:155,hex:"A6A69B"},{code:"SW6200",name:"Link Gray",r:127,g:126,b:114,hex:"7F7E72"},{code:"SW6201",name:"Thunderous",r:109,g:108,b:98,hex:"6D6C62"},{code:"SW6202",name:"Cast Iron",r:100,g:100,b:90,hex:"64645A"},{code:"SW6203",name:"Spare White",r:228,g:228,b:221,hex:"E4E4DD"},{code:"SW6204",name:"Sea Salt",r:205,g:210,b:202,hex:"CDD2CA"},{code:"SW6205",name:"Comfort Gray",r:190,g:195,b:187,hex:"BEC3BB"},{code:"SW6206",name:"Oyster Bay",r:174,g:179,b:169,hex:"AEB3A9"},{code:"SW6207",name:"Retreat",r:122,g:128,b:118,hex:"7A8076"},{code:"SW6208",name:"Pewter Green",r:94,g:98,b:89,hex:"5E6259"},{code:"SW6209",name:"Ripe Olive",r:68,g:72,b:61,hex:"44483D"},{code:"SW6210",name:"Window Pane",r:215,g:223,b:216,hex:"D7DFD8"},{code:"SW6211",name:"Rainwashed",r:194,g:205,b:197,hex:"C2CDC5"},{code:"SW6212",name:"Quietude",r:173,g:187,b:178,hex:"ADBBB2"},{code:"SW6213",name:"Halcyon Green",r:155,g:170,b:162,hex:"9BAAA2"},{code:"SW6214",name:"Underseas",r:124,g:142,b:135,hex:"7C8E87"},{code:"SW6215",name:"Rocky River",r:94,g:112,b:106,hex:"5E706A"},{code:"SW6216",name:"Jasper",r:52,g:59,b:54,hex:"343B36"},{code:"SW6217",name:"Topsail",r:218,g:226,b:224,hex:"DAE2E0"},{code:"SW6218",name:"Tradewind",r:194,g:207,b:207,hex:"C2CFCF"},{code:"SW6219",name:"Rain",r:171,g:190,b:191,hex:"ABBEBF"},{code:"SW6220",name:"Interesting Aqua",r:155,g:175,b:178,hex:"9BAFB2"},{code:"SW6221",name:"Moody Blue",r:122,g:145,b:146,hex:"7A9192"},{code:"SW6222",name:"Riverway",r:93,g:114,b:116,hex:"5D7274"},{code:"SW6223",name:"Still Water",r:74,g:93,b:95,hex:"4A5D5F"},{code:"SW6224",name:"Mountain Air",r:216,g:224,b:223,hex:"D8E0DF"},{code:"SW6225",name:"Sleepy Blue",r:188,g:203,b:206,hex:"BCCBCE"},{code:"SW6226",name:"Languid Blue",r:164,g:183,b:189,hex:"A4B7BD"},{code:"SW6227",name:"Meditative",r:150,g:170,b:176,hex:"96AAB0"},{code:"SW6228",name:"Refuge",r:96,g:125,b:132,hex:"607D84"},{code:"SW6229",name:"Tempe Star",r:71,g:98,b:106,hex:"47626A"},{code:"SW6230",name:"Rainstorm",r:36,g:70,b:83,hex:"244653"},{code:"SW6231",name:"Rock Candy",r:222,g:225,b:223,hex:"DEE1DF"},{code:"SW6232",name:"Misty",r:205,g:210,b:210,hex:"CDD2D2"},{code:"SW6233",name:"Samovar Silver",r:184,g:190,b:190,hex:"B8BEBE"},{code:"SW6234",name:"Uncertain Gray",r:169,g:176,b:177,hex:"A9B0B1"},{code:"SW6235",name:"Foggy Day",r:114,g:124,b:127,hex:"727C7F"},{code:"SW6236",name:"Grays Harbor",r:89,g:99,b:104,hex:"596368"},{code:"SW6237",name:"Dark Night",r:35,g:56,b:63,hex:"23383F"},{code:"SW6238",name:"Icicle",r:219,g:223,b:224,hex:"DBDFE0"},{code:"SW6239",name:"Upward",r:191,g:201,b:208,hex:"BFC9D0"},{code:"SW6240",name:"Windy Blue",r:170,g:186,b:198,hex:"AABAC6"},{code:"SW6241",name:"Aleutian",r:152,g:169,b:183,hex:"98A9B7"},{code:"SW6242",name:"Bracing Blue",r:118,g:139,b:154,hex:"768B9A"},{code:"SW6243",name:"Distance",r:93,g:111,b:127,hex:"5D6F7F"},{code:"SW6244",name:"Naval",r:47,g:61,b:76,hex:"2F3D4C"},{code:"SW6245",name:"Quicksilver",r:221,g:226,b:224,hex:"DDE2E0"},{code:"SW6246",name:"North Star",r:202,g:208,b:210,hex:"CAD0D2"},{code:"SW6247",name:"Krypton",r:184,g:192,b:195,hex:"B8C0C3"},{code:"SW6248",name:"Jubilee",r:173,g:181,b:185,hex:"ADB5B9"},{code:"SW6249",name:"Storm Cloud",r:122,g:132,b:141,hex:"7A848D"},{code:"SW6250",name:"Granite Peak",r:96,g:107,b:117,hex:"606B75"},{code:"SW6251",name:"Outerspace",r:88,g:97,b:104,hex:"586168"},{code:"SW6252",name:"Ice Cube",r:227,g:228,b:225,hex:"E3E4E1"},{code:"SW6253",name:"Olympus White",r:212,g:216,b:215,hex:"D4D8D7"},{code:"SW6254",name:"Lazy Gray",r:190,g:193,b:195,hex:"BEC1C3"},{code:"SW6255",name:"Morning Fog",r:168,g:174,b:177,hex:"A8AEB1"},{code:"SW6256",name:"Serious Gray",r:125,g:132,b:139,hex:"7D848B"},{code:"SW6257",name:"Gibraltar",r:98,g:105,b:112,hex:"626970"},{code:"SW6258",name:"Tricorn Black",r:47,g:47,b:48,hex:"2F2F30"},{code:"SW6259",name:"Spatial White",r:221,g:220,b:219,hex:"DDDCDB"},{code:"SW6260",name:"Unique Gray",r:203,g:201,b:201,hex:"CBC9C9"},{code:"SW6261",name:"Swanky Gray",r:181,g:177,b:181,hex:"B5B1B5"},{code:"SW6262",name:"Mysterious Mauve",r:166,g:163,b:169,hex:"A6A3A9"},{code:"SW6263",name:"Exclusive Plum",r:115,g:111,b:120,hex:"736F78"},{code:"SW6264",name:"Midnight",r:93,g:89,b:98,hex:"5D5962"},{code:"SW6265",name:"Quixotic Plum",r:74,g:70,b:83,hex:"4A4653"},{code:"SW6267",name:"Sensitive Tint",r:206,g:201,b:204,hex:"CEC9CC"},{code:"SW6268",name:"Veiled Violet",r:189,g:181,b:185,hex:"BDB5B9"},{code:"SW6269",name:"Beguiling Mauve",r:175,g:167,b:172,hex:"AFA7AC"},{code:"SW6270",name:"Soulmate",r:133,g:119,b:123,hex:"85777B"},{code:"SW6271",name:"Expressive Plum",r:105,g:92,b:98,hex:"695C62"},{code:"SW6272",name:"Plum Brown",r:78,g:66,b:71,hex:"4E4247"},{code:"SW6274",name:"Destiny",r:207,g:201,b:200,hex:"CFC9C8"},{code:"SW6275",name:"Fashionable Gray",r:189,g:184,b:184,hex:"BDB8B8"},{code:"SW6276",name:"Mystical Shade",r:174,g:169,b:170,hex:"AEA9AA"},{code:"SW6277",name:"Special Gray",r:123,g:120,b:125,hex:"7B787D"},{code:"SW6278",name:"Cloak Gray",r:96,g:94,b:99,hex:"605E63"},{code:"SW6279",name:"Black Swan",r:58,g:55,b:62,hex:"3A373E"},{code:"SW6281",name:"Wallflower",r:219,g:207,b:212,hex:"DBCFD4"},{code:"SW6282",name:"Mauve Finery",r:203,g:184,b:192,hex:"CBB8C0"},{code:"SW6283",name:"Thistle",r:170,g:142,b:154,hex:"AA8E9A"},{code:"SW6284",name:"Plum Dandy",r:139,g:104,b:120,hex:"8B6878"},{code:"SW6285",name:"Grape Harvest",r:126,g:90,b:109,hex:"7E5A6D"},{code:"SW6286",name:"Mature Grape",r:95,g:63,b:84,hex:"5F3F54"},{code:"SW6288",name:"Rosebud",r:224,g:205,b:209,hex:"E0CDD1"},{code:"SW6289",name:"Delightful",r:210,g:182,b:190,hex:"D2B6BE"},{code:"SW6290",name:"Ros�",r:185,g:149,b:161,hex:"B995A1"},{code:"SW6291",name:"Moss Rose",r:158,g:109,b:121,hex:"9E6D79"},{code:"SW6292",name:"Berry Bush",r:141,g:88,b:105,hex:"8D5869"},{code:"SW6293",name:"Fabulous Grape",r:109,g:52,b:79,hex:"6D344F"},{code:"SW6295",name:"Demure",r:232,g:212,b:213,hex:"E8D4D5"},{code:"SW6296",name:"Fading Rose",r:218,g:189,b:193,hex:"DABDC1"},{code:"SW6297",name:"Rose Embroidery",r:199,g:158,b:162,hex:"C79EA2"},{code:"SW6298",name:"Concerto",r:158,g:107,b:117,hex:"9E6B75"},{code:"SW6299",name:"Aged Wine",r:137,g:84,b:96,hex:"895460"},{code:"SW6300",name:"Burgundy",r:99,g:51,b:62,hex:"63333E"},{code:"SW6302",name:"Innocence",r:235,g:209,b:207,hex:"EBD1CF"},{code:"SW6303",name:"Rose Colored",r:220,g:182,b:181,hex:"DCB6B5"},{code:"SW6304",name:"Pressed Flower",r:195,g:147,b:147,hex:"C39393"},{code:"SW6305",name:"Rambling Rose",r:153,g:93,b:98,hex:"995D62"},{code:"SW6306",name:"Cordial",r:134,g:76,b:82,hex:"864C52"},{code:"SW6307",name:"Fine Wine",r:114,g:57,b:65,hex:"723941"},{code:"SW6309",name:"Charming Pink",r:237,g:211,b:210,hex:"EDD3D2"},{code:"SW6310",name:"Lotus Flower",r:230,g:189,b:189,hex:"E6BDBD"},{code:"SW6311",name:"Memorable Rose",r:207,g:138,b:141,hex:"CF8A8D"},{code:"SW6312",name:"Redbud",r:173,g:94,b:101,hex:"AD5E65"},{code:"SW6313",name:"Kirsch Red",r:151,g:73,b:83,hex:"974953"},{code:"SW6314",name:"Luxurious Red",r:134,g:58,b:66,hex:"863A42"},{code:"SW6316",name:"Rosy Outlook",r:235,g:206,b:203,hex:"EBCECB"},{code:"SW6317",name:"Gracious Rose",r:227,g:183,b:177,hex:"E3B7B1"},{code:"SW6318",name:"Resounding Rose",r:205,g:142,b:137,hex:"CD8E89"},{code:"SW6319",name:"Reddish",r:181,g:105,b:102,hex:"B56966"},{code:"SW6320",name:"Bravado Red",r:160,g:82,b:78,hex:"A0524E"},{code:"SW6321",name:"Red Bay",r:142,g:55,b:56,hex:"8E3738"},{code:"SW6322",name:"Intimate White",r:240,g:225,b:216,hex:"F0E1D8"},{code:"SW6323",name:"Romance",r:235,g:207,b:195,hex:"EBCFC3"},{code:"SW6324",name:"Mellow Coral",r:227,g:181,b:168,hex:"E3B5A8"},{code:"SW6325",name:"Constant Coral",r:205,g:142,b:127,hex:"CD8E7F"},{code:"SW6326",name:"Henna Shade",r:179,g:103,b:93,hex:"B3675D"},{code:"SW6327",name:"Bold Brick",r:160,g:88,b:79,hex:"A0584F"},{code:"SW6328",name:"Fireweed",r:123,g:55,b:48,hex:"7B3730"},{code:"SW6329",name:"Faint Coral",r:238,g:222,b:213,hex:"EEDED5"},{code:"SW6330",name:"Quaint Peche",r:234,g:205,b:193,hex:"EACDC1"},{code:"SW6331",name:"Smoky Salmon",r:226,g:182,b:167,hex:"E2B6A7"},{code:"SW6332",name:"Coral Island",r:206,g:147,b:130,hex:"CE9382"},{code:"SW6333",name:"Foxy",r:168,g:94,b:83,hex:"A85E53"},{code:"SW6334",name:"Flower Pot",r:143,g:68,b:56,hex:"8F4438"},{code:"SW6335",name:"Fired Brick",r:131,g:56,b:42,hex:"83382A"},{code:"SW6336",name:"Nearly Peach",r:239,g:222,b:209,hex:"EFDED1"},{code:"SW6337",name:"Spun Sugar",r:237,g:210,b:192,hex:"EDD2C0"},{code:"SW6338",name:"Warming Peach",r:228,g:185,b:162,hex:"E4B9A2"},{code:"SW6339",name:"Persimmon",r:217,g:152,b:124,hex:"D9987C"},{code:"SW6340",name:"Baked Clay",r:193,g:120,b:92,hex:"C1785C"},{code:"SW6341",name:"Red Cent",r:173,g:101,b:76,hex:"AD654C"},{code:"SW6342",name:"Spicy Hue",r:153,g:75,b:53,hex:"994B35"},{code:"SW6343",name:"Alluring White",r:239,g:225,b:210,hex:"EFE1D2"},{code:"SW6344",name:"Peach Fuzz",r:236,g:207,b:187,hex:"ECCFBB"},{code:"SW6345",name:"Sumptuous Peach",r:229,g:185,b:155,hex:"E5B99B"},{code:"SW6346",name:"Fame Orange",r:219,g:156,b:123,hex:"DB9C7B"},{code:"SW6347",name:"Chrysanthemum",r:196,g:123,b:91,hex:"C47B5B"},{code:"SW6348",name:"Reynard",r:180,g:104,b:72,hex:"B46848"},{code:"SW6349",name:"Pennywise",r:162,g:88,b:58,hex:"A2583A"},{code:"SW6350",name:"Intricate Ivory",r:237,g:221,b:202,hex:"EDDDCA"},{code:"SW6351",name:"Sweet Orange",r:235,g:204,b:179,hex:"EBCCB3"},{code:"SW6352",name:"Soft Apricot",r:224,g:179,b:146,hex:"E0B392"},{code:"SW6353",name:"Chivalry Copper",r:212,g:150,b:110,hex:"D4966E"},{code:"SW6354",name:"Armagnac",r:195,g:128,b:88,hex:"C38058"},{code:"SW6355",name:"Truepenny",r:180,g:108,b:66,hex:"B46C42"},{code:"SW6356",name:"Copper Mountain",r:166,g:97,b:60,hex:"A6613C"},{code:"SW6357",name:"Choice Cream",r:240,g:225,b:208,hex:"F0E1D0"},{code:"SW6358",name:"Creamery",r:237,g:208,b:182,hex:"EDD0B6"},{code:"SW6359",name:"Sociable",r:232,g:190,b:155,hex:"E8BE9B"},{code:"SW6360",name:"Folksy Gold",r:214,g:153,b:105,hex:"D69969"},{code:"SW6361",name:"Autumnal",r:205,g:140,b:93,hex:"CD8C5D"},{code:"SW6362",name:"Tigereye",r:187,g:119,b:72,hex:"BB7748"},{code:"SW6363",name:"Gingery",r:176,g:108,b:62,hex:"B06C3E"},{code:"SW6364",name:"Eggwhite",r:243,g:229,b:210,hex:"F3E5D2"},{code:"SW6365",name:"Cachet Cream",r:243,g:217,b:186,hex:"F3D9BA"},{code:"SW6366",name:"Ambitious Amber",r:240,g:203,b:151,hex:"F0CB97"},{code:"SW6367",name:"Viva Gold",r:227,g:172,b:114,hex:"E3AC72"},{code:"SW6368",name:"Bakelite Gold",r:215,g:153,b:93,hex:"D7995D"},{code:"SW6369",name:"Tassel",r:198,g:136,b:74,hex:"C6884A"},{code:"SW6370",name:"Saucy Gold",r:182,g:116,b:59,hex:"B6743B"},{code:"SW6371",name:"Vanillin",r:242,g:227,b:202,hex:"F2E3CA"},{code:"SW6372",name:"Inviting Ivory",r:242,g:213,b:176,hex:"F2D5B0"},{code:"SW6373",name:"Harvester",r:237,g:195,b:142,hex:"EDC38E"},{code:"SW6374",name:"Torchlight",r:229,g:174,b:107,hex:"E5AE6B"},{code:"SW6375",name:"Honeycomb",r:213,g:152,b:88,hex:"D59858"},{code:"SW6376",name:"Gold Coast",r:199,g:133,b:56,hex:"C78538"},{code:"SW6377",name:"Butterscotch",r:182,g:125,b:60,hex:"B67D3C"},{code:"SW6378",name:"Crisp Linen",r:243,g:230,b:212,hex:"F3E6D4"},{code:"SW6379",name:"Jersey Cream",r:245,g:222,b:187,hex:"F5DEBB"},{code:"SW6380",name:"Humble Gold",r:237,g:199,b:150,hex:"EDC796"},{code:"SW6381",name:"Anjou Pear",r:221,g:172,b:109,hex:"DDAC6D"},{code:"SW6382",name:"Ceremonial Gold",r:214,g:158,b:89,hex:"D69E59"},{code:"SW6383",name:"Golden Rule",r:204,g:146,b:73,hex:"CC9249"},{code:"SW6384",name:"Cut the Mustard",r:186,g:127,b:56,hex:"BA7F38"},{code:"SW6385",name:"Dover White",r:240,g:234,b:220,hex:"F0EADC"},{code:"SW6386",name:"Napery",r:239,g:221,b:193,hex:"EFDDC1"},{code:"SW6387",name:"Compatible Cream",r:232,g:200,b:158,hex:"E8C89E"},{code:"SW6388",name:"Golden Fleece",r:214,g:173,b:120,hex:"D6AD78"},{code:"SW6389",name:"Butternut",r:204,g:155,b:92,hex:"CC9B5C"},{code:"SW6390",name:"Bosc Pear",r:192,g:144,b:86,hex:"C09056"},{code:"SW6391",name:"Gallant Gold",r:164,g:118,b:60,hex:"A4763C"},{code:"SW6392",name:"Vital Yellow",r:237,g:224,b:197,hex:"EDE0C5"},{code:"SW6393",name:"Convivial Yellow",r:233,g:214,b:176,hex:"E9D6B0"},{code:"SW6394",name:"Sequin",r:225,g:194,b:141,hex:"E1C28D"},{code:"SW6395",name:"Alchemy",r:201,g:158,b:83,hex:"C99E53"},{code:"SW6396",name:"Different Gold",r:188,g:147,b:77,hex:"BC934D"},{code:"SW6397",name:"Nankeen",r:170,g:128,b:58,hex:"AA803A"},{code:"SW6398",name:"Sconce Gold",r:153,g:111,b:50,hex:"996F32"},{code:"SW6399",name:"Chamomile",r:233,g:224,b:197,hex:"E9E0C5"},{code:"SW6400",name:"Lucent Yellow",r:228,g:208,b:165,hex:"E4D0A5"},{code:"SW6401",name:"Independent Gold",r:210,g:186,b:131,hex:"D2BA83"},{code:"SW6402",name:"Antiquity",r:194,g:164,b:98,hex:"C2A462"},{code:"SW6403",name:"Escapade Gold",r:184,g:155,b:89,hex:"B89B59"},{code:"SW6404",name:"Grandiose",r:156,g:127,b:65,hex:"9C7F41"},{code:"SW6405",name:"Fervent Brass",r:149,g:121,b:61,hex:"95793D"},{code:"SW6406",name:"Ionic Ivory",r:231,g:223,b:197,hex:"E7DFC5"},{code:"SW6407",name:"Ancestral Gold",r:221,g:205,b:166,hex:"DDCDA6"},{code:"SW6408",name:"Wheat Grass",r:203,g:181,b:132,hex:"CBB584"},{code:"SW6409",name:"Edgy Gold",r:177,g:151,b:95,hex:"B1975F"},{code:"SW6410",name:"Brassy",r:157,g:131,b:68,hex:"9D8344"},{code:"SW6411",name:"Bengal Grass",r:142,g:119,b:63,hex:"8E773F"},{code:"SW6412",name:"Eminent Bronze",r:122,g:104,b:65,hex:"7A6841"},{code:"SW6413",name:"Restoration Ivory",r:233,g:225,b:202,hex:"E9E1CA"},{code:"SW6414",name:"Rice Paddy",r:223,g:212,b:176,hex:"DFD4B0"},{code:"SW6415",name:"Hearts of Palm",r:207,g:194,b:145,hex:"CFC291"},{code:"SW6416",name:"Sassy Green",r:187,g:168,b:106,hex:"BBA86A"},{code:"SW6417",name:"Tupelo Tree",r:156,g:145,b:82,hex:"9C9152"},{code:"SW6418",name:"Rural Green",r:141,g:132,b:77,hex:"8D844D"},{code:"SW6419",name:"Saguaro",r:101,g:95,b:45,hex:"655F2D"},{code:"SW6420",name:"Queen Anne's Lace",r:236,g:234,b:213,hex:"ECEAD5"},{code:"SW6421",name:"Celery",r:224,g:221,b:189,hex:"E0DDBD"},{code:"SW6422",name:"Shagreen",r:203,g:201,b:157,hex:"CBC99D"},{code:"SW6423",name:"Ryegrass",r:174,g:172,b:122,hex:"AEAC7A"},{code:"SW6424",name:"Tansy Green",r:149,g:148,b:92,hex:"95945C"},{code:"SW6425",name:"Relentless Olive",r:113,g:113,b:62,hex:"71713E"},{code:"SW6426",name:"Basque Green",r:95,g:96,b:51,hex:"5F6033"},{code:"SW6427",name:"Sprout",r:228,g:228,b:206,hex:"E4E4CE"},{code:"SW6428",name:"Honeydew",r:219,g:221,b:189,hex:"DBDDBD"},{code:"SW6429",name:"Baize Green",r:199,g:205,b:168,hex:"C7CDA8"},{code:"SW6430",name:"Great Green",r:171,g:180,b:134,hex:"ABB486"},{code:"SW6431",name:"Leapfrog",r:136,g:145,b:93,hex:"88915D"},{code:"SW6432",name:"Garden Spot",r:109,g:118,b:69,hex:"6D7645"},{code:"SW6433",name:"Inverness",r:87,g:98,b:56,hex:"576238"},{code:"SW6434",name:"Spinach White",r:228,g:232,b:218,hex:"E4E8DA"},{code:"SW6435",name:"Gratifying Green",r:218,g:226,b:205,hex:"DAE2CD"},{code:"SW6436",name:"Bonsai Tint",r:197,g:209,b:178,hex:"C5D1B2"},{code:"SW6437",name:"Haven",r:163,g:180,b:140,hex:"A3B48C"},{code:"SW6438",name:"Dill",r:120,g:141,b:96,hex:"788D60"},{code:"SW6439",name:"Greenfield",r:96,g:114,b:79,hex:"60724F"},{code:"SW6440",name:"Courtyard",r:71,g:88,b:66,hex:"475842"},{code:"SW6441",name:"White Mint",r:224,g:231,b:218,hex:"E0E7DA"},{code:"SW6442",name:"Supreme Green",r:207,g:221,b:199,hex:"CFDDC7"},{code:"SW6443",name:"Relish",r:179,g:203,b:170,hex:"B3CBAA"},{code:"SW6444",name:"Lounge Green",r:139,g:169,b:127,hex:"8BA97F"},{code:"SW6445",name:"Garden Grove",r:94,g:127,b:87,hex:"5E7F57"},{code:"SW6446",name:"Arugula",r:66,g:96,b:60,hex:"42603C"},{code:"SW6447",name:"Evergreens",r:64,g:88,b:64,hex:"405840"},{code:"SW6449",name:"Topiary Tint",r:200,g:216,b:196,hex:"C8D8C4"},{code:"SW6450",name:"Easy Green",r:172,g:194,b:168,hex:"ACC2A8"},{code:"SW6451",name:"Nurture Green",r:152,g:176,b:146,hex:"98B092"},{code:"SW6452",name:"Inland",r:108,g:136,b:103,hex:"6C8867"},{code:"SW6453",name:"Cilantro",r:83,g:113,b:80,hex:"537150"},{code:"SW6454",name:"Shamrock",r:32,g:81,b:52,hex:"205134"},{code:"SW6455",name:"Fleeting Green",r:216,g:226,b:216,hex:"D8E2D8"},{code:"SW6456",name:"Slow Green",r:198,g:213,b:201,hex:"C6D5C9"},{code:"SW6457",name:"Kind Green",r:170,g:194,b:179,hex:"AAC2B3"},{code:"SW6458",name:"Restful",r:145,g:175,b:157,hex:"91AF9D"},{code:"SW6459",name:"Jadite",r:97,g:130,b:108,hex:"61826C"},{code:"SW6460",name:"Kale Green",r:79,g:106,b:86,hex:"4F6A56"},{code:"SW6461",name:"Isle of Pines",r:61,g:85,b:65,hex:"3D5541"},{code:"SW6462",name:"Green Trance",r:215,g:228,b:219,hex:"D7E4DB"},{code:"SW6463",name:"Breaktime",r:196,g:217,b:206,hex:"C4D9CE"},{code:"SW6464",name:"Aloe",r:172,g:202,b:188,hex:"ACCABC"},{code:"SW6465",name:"Spearmint",r:148,g:181,b:166,hex:"94B5A6"},{code:"SW6466",name:"Grandview",r:107,g:146,b:127,hex:"6B927F"},{code:"SW6467",name:"Kendal Green",r:84,g:120,b:103,hex:"547867"},{code:"SW6468",name:"Hunt Club",r:42,g:79,b:67,hex:"2A4F43"},{code:"SW6470",name:"Waterscape",r:191,g:210,b:201,hex:"BFD2C9"},{code:"SW6471",name:"Hazel",r:168,g:193,b:183,hex:"A8C1B7"},{code:"SW6472",name:"Composed",r:126,g:162,b:152,hex:"7EA298"},{code:"SW6473",name:"Surf Green",r:95,g:136,b:125,hex:"5F887D"},{code:"SW6474",name:"Raging Sea",r:71,g:111,b:101,hex:"476F65"},{code:"SW6475",name:"Country Squire",r:18,g:74,b:66,hex:"124A42"},{code:"SW6476",name:"Glimmer",r:224,g:231,b:226,hex:"E0E7E2"},{code:"SW6477",name:"Tidewater",r:195,g:215,b:211,hex:"C3D7D3"},{code:"SW6478",name:"Watery",r:180,g:204,b:201,hex:"B4CCC9"},{code:"SW6479",name:"Drizzle",r:140,g:174,b:171,hex:"8CAEAB"},{code:"SW6480",name:"Lagoon",r:81,g:134,b:130,hex:"518682"},{code:"SW6481",name:"Green Bay",r:46,g:104,b:100,hex:"2E6864"},{code:"SW6482",name:"Cape Verde",r:1,g:85,b:79,hex:"01554F"},{code:"SW6484",name:"Meander Blue",r:190,g:219,b:216,hex:"BEDBD8"},{code:"SW6485",name:"Raindrop",r:158,g:198,b:198,hex:"9EC6C6"},{code:"SW6486",name:"Reflecting Pool",r:123,g:177,b:178,hex:"7BB1B2"},{code:"SW6487",name:"Cloudburst",r:92,g:149,b:152,hex:"5C9598"},{code:"SW6488",name:"Grand Canal",r:60,g:121,b:125,hex:"3C797D"},{code:"SW6489",name:"Really Teal",r:1,g:99,b:103,hex:"016367"},{code:"SW6491",name:"Open Air",r:199,g:223,b:224,hex:"C7DFE0"},{code:"SW6492",name:"Jetstream",r:176,g:210,b:214,hex:"B0D2D6"},{code:"SW6493",name:"Ebbtide",r:132,g:180,b:190,hex:"84B4BE"},{code:"SW6494",name:"Lakeshore",r:91,g:150,b:162,hex:"5B96A2"},{code:"SW6495",name:"Great Falls",r:33,g:119,b:134,hex:"217786"},{code:"SW6496",name:"Oceanside",r:1,g:90,b:107,hex:"015A6B"},{code:"SW6497",name:"Blue Horizon",r:216,g:231,b:230,hex:"D8E7E6"},{code:"SW6498",name:"Byte Blue",r:197,g:220,b:224,hex:"C5DCE0"},{code:"SW6499",name:"Stream",r:173,g:204,b:211,hex:"ADCCD3"},{code:"SW6500",name:"Open Seas",r:131,g:175,b:188,hex:"83AFBC"},{code:"SW6501",name:"Manitou Blue",r:91,g:146,b:162,hex:"5B92A2"},{code:"SW6502",name:"Loch Blue",r:47,g:119,b:139,hex:"2F778B"},{code:"SW6503",name:"Bosporus",r:1,g:93,b:117,hex:"015D75"},{code:"SW6504",name:"Sky High",r:220,g:231,b:232,hex:"DCE7E8"},{code:"SW6505",name:"Atmospheric",r:194,g:218,b:224,hex:"C2DAE0"},{code:"SW6506",name:"Vast Sky",r:169,g:201,b:215,hex:"A9C9D7"},{code:"SW6507",name:"Resolute Blue",r:133,g:176,b:196,hex:"85B0C4"},{code:"SW6508",name:"Secure Blue",r:83,g:137,b:161,hex:"5389A1"},{code:"SW6509",name:"Georgian Bay",r:34,g:101,b:127,hex:"22657F"},{code:"SW6510",name:"Loyal Blue",r:1,g:69,b:94,hex:"01455E"},{code:"SW6511",name:"Snowdrop",r:224,g:232,b:231,hex:"E0E8E7"},{code:"SW6512",name:"Balmy",r:197,g:216,b:222,hex:"C5D8DE"},{code:"SW6513",name:"Take Five",r:179,g:201,b:211,hex:"B3C9D3"},{code:"SW6514",name:"Respite",r:151,g:180,b:195,hex:"97B4C3"},{code:"SW6515",name:"Leisure Blue",r:106,g:142,b:161,hex:"6A8EA1"},{code:"SW6516",name:"Down Pour",r:67,g:113,b:139,hex:"43718B"},{code:"SW6517",name:"Regatta",r:33,g:87,b:114,hex:"215772"},{code:"SW6519",name:"Hinting Blue",r:206,g:217,b:221,hex:"CED9DD"},{code:"SW6520",name:"Honest Blue",r:178,g:199,b:211,hex:"B2C7D3"},{code:"SW6521",name:"Notable Hue",r:139,g:167,b:187,hex:"8BA7BB"},{code:"SW6522",name:"Sporty Blue",r:106,g:138,b:164,hex:"6A8AA4"},{code:"SW6523",name:"Denim",r:80,g:107,b:132,hex:"506B84"},{code:"SW6524",name:"Commodore",r:37,g:71,b:106,hex:"25476A"},{code:"SW6525",name:"Rarified Air",r:225,g:230,b:230,hex:"E1E6E6"},{code:"SW6526",name:"Icelandic",r:203,g:216,b:225,hex:"CBD8E1"},{code:"SW6527",name:"Blissful Blue",r:178,g:200,b:216,hex:"B2C8D8"},{code:"SW6528",name:"Cosmos",r:142,g:169,b:194,hex:"8EA9C2"},{code:"SW6529",name:"Scanda",r:107,g:140,b:169,hex:"6B8CA9"},{code:"SW6530",name:"Revel Blue",r:76,g:107,b:138,hex:"4C6B8A"},{code:"SW6531",name:"Indigo",r:40,g:74,b:112,hex:"284A70"},{code:"SW6533",name:"Mild Blue",r:203,g:213,b:219,hex:"CBD5DB"},{code:"SW6534",name:"Icy",r:187,g:199,b:210,hex:"BBC7D2"},{code:"SW6535",name:"Solitude",r:153,g:167,b:184,hex:"99A7B8"},{code:"SW6536",name:"Searching Blue",r:108,g:127,b:154,hex:"6C7F9A"},{code:"SW6537",name:"Luxe Blue",r:81,g:101,b:130,hex:"516582"},{code:"SW6538",name:"Dignified",r:59,g:73,b:109,hex:"3B496D"},{code:"SW6540",name:"Starry Night",r:214,g:217,b:222,hex:"D6D9DE"},{code:"SW6541",name:"Daydream",r:189,g:195,b:205,hex:"BDC3CD"},{code:"SW6542",name:"Vesper Violet",r:153,g:160,b:178,hex:"99A0B2"},{code:"SW6543",name:"Soulful Blue",r:117,g:124,b:145,hex:"757C91"},{code:"SW6544",name:"Mesmerize",r:93,g:101,b:123,hex:"5D657B"},{code:"SW6545",name:"Majestic Purple",r:59,g:60,b:90,hex:"3B3C5A"},{code:"SW6547",name:"Silver Peony",r:218,g:214,b:219,hex:"DAD6DB"},{code:"SW6548",name:"Grape Mist",r:197,g:192,b:201,hex:"C5C0C9"},{code:"SW6549",name:"Ash Violet",r:162,g:155,b:170,hex:"A29BAA"},{code:"SW6550",name:"Mythical",r:126,g:119,b:142,hex:"7E778E"},{code:"SW6551",name:"Purple Passage",r:100,g:94,b:119,hex:"645E77"},{code:"SW6552",name:"Dewberry",r:62,g:56,b:90,hex:"3E385A"},{code:"SW6554",name:"Lite Lavender",r:224,g:218,b:223,hex:"E0DADF"},{code:"SW6555",name:"Enchant",r:209,g:198,b:210,hex:"D1C6D2"},{code:"SW6556",name:"Obi Lilac",r:176,g:163,b:182,hex:"B0A3B6"},{code:"SW6557",name:"Wood Violet",r:122,g:107,b:133,hex:"7A6B85"},{code:"SW6558",name:"Plummy",r:103,g:90,b:117,hex:"675A75"},{code:"SW6559",name:"Concord Grape",r:68,g:55,b:87,hex:"443757"},{code:"SW6561",name:"Teaberry",r:235,g:209,b:219,hex:"EBD1DB"},{code:"SW6562",name:"Irresistible",r:227,g:192,b:207,hex:"E3C0CF"},{code:"SW6563",name:"Rosebay",r:203,g:154,b:173,hex:"CB9AAD"},{code:"SW6564",name:"Red Clover",r:184,g:126,b:147,hex:"B87E93"},{code:"SW6565",name:"Grandeur Plum",r:146,g:87,b:111,hex:"92576F"},{code:"SW6566",name:"Framboise",r:124,g:54,b:85,hex:"7C3655"},{code:"SW6568",name:"Lighthearted Pink",r:237,g:213,b:221,hex:"EDD5DD"},{code:"SW6569",name:"Childlike",r:232,g:192,b:207,hex:"E8C0CF"},{code:"SW6570",name:"Haute Pink",r:216,g:153,b:177,hex:"D899B1"},{code:"SW6571",name:"Cyclamen",r:196,g:123,b:149,hex:"C47B95"},{code:"SW6572",name:"Ruby Shade",r:162,g:86,b:111,hex:"A2566F"},{code:"SW6573",name:"Juneberry",r:133,g:65,b:88,hex:"854158"},{code:"SW6575",name:"Priscilla",r:241,g:211,b:218,hex:"F1D3DA"},{code:"SW6576",name:"Azalea Flower",r:239,g:192,b:203,hex:"EFC0CB"},{code:"SW6577",name:"Jaipur Pink",r:227,g:146,b:161,hex:"E392A1"},{code:"SW6578",name:"Tuberose",r:212,g:124,b:140,hex:"D47C8C"},{code:"SW6579",name:"Gala Pink",r:176,g:75,b:99,hex:"B04B63"},{code:"SW6580",name:"Cerise",r:153,g:50,b:78,hex:"99324E"},{code:"SW6582",name:"Impatiens Petal",r:241,g:210,b:215,hex:"F1D2D7"},{code:"SW6583",name:"In the Pink",r:240,g:188,b:201,hex:"F0BCC9"},{code:"SW6584",name:"Cheery",r:235,g:146,b:163,hex:"EB92A3"},{code:"SW6585",name:"Coming up Roses",r:221,g:119,b:136,hex:"DD7788"},{code:"SW6586",name:"Heartfelt",r:189,g:76,b:95,hex:"BD4C5F"},{code:"SW6587",name:"Valentine",r:165,g:58,b:78,hex:"A53A4E"},{code:"SW6589",name:"Alyssum",r:242,g:213,b:215,hex:"F2D5D7"},{code:"SW6590",name:"Loveable",r:240,g:193,b:198,hex:"F0C1C6"},{code:"SW6591",name:"Amaryllis",r:237,g:147,b:157,hex:"ED939D"},{code:"SW6592",name:"Grenadine",r:214,g:105,b:114,hex:"D66972"},{code:"SW6593",name:"Coral Bells",r:187,g:75,b:81,hex:"BB4B51"},{code:"SW6594",name:"Poinsettia",r:157,g:55,b:60,hex:"9D373C"},{code:"SW6596",name:"Bella Pink",r:241,g:198,b:196,hex:"F1C6C4"},{code:"SW6597",name:"Hopeful",r:240,g:179,b:178,hex:"F0B3B2"},{code:"SW6598",name:"Dishy Coral",r:237,g:145,b:144,hex:"ED9190"},{code:"SW6599",name:"Begonia",r:215,g:108,b:110,hex:"D76C6E"},{code:"SW6600",name:"Enticing Red",r:183,g:78,b:79,hex:"B74E4F"},{code:"SW6601",name:"Tanager",r:164,g:56,b:52,hex:"A43834"},{code:"SW6603",name:"Oleander",r:242,g:204,b:197,hex:"F2CCC5"},{code:"SW6604",name:"Youthful Coral",r:240,g:175,b:168,hex:"F0AFA8"},{code:"SW6605",name:"Charisma",r:238,g:148,b:137,hex:"EE9489"},{code:"SW6606",name:"Coral Reef",r:217,g:118,b:108,hex:"D9766C"},{code:"SW6607",name:"Red Tomato",r:178,g:71,b:67,hex:"B24743"},{code:"SW6608",name:"Rave Red",r:161,g:59,b:52,hex:"A13B34"},{code:"SW6610",name:"Koral Kicks",r:242,g:209,b:195,hex:"F2D1C3"},{code:"SW6611",name:"Jovial",r:242,g:184,b:167,hex:"F2B8A7"},{code:"SW6612",name:"Ravishing Coral",r:231,g:149,b:128,hex:"E79580"},{code:"SW6613",name:"Lei Flower",r:216,g:123,b:106,hex:"D87B6A"},{code:"SW6614",name:"Quite Coral",r:199,g:99,b:86,hex:"C76356"},{code:"SW6615",name:"Peppery",r:184,g:84,b:68,hex:"B85444"},{code:"SW6617",name:"Blushing",r:240,g:209,b:195,hex:"F0D1C3"},{code:"SW6618",name:"Cosmetic Peach",r:243,g:193,b:171,hex:"F3C1AB"},{code:"SW6619",name:"Sockeye",r:228,g:151,b:128,hex:"E49780"},{code:"SW6620",name:"Rejuvenate",r:221,g:120,b:97,hex:"DD7861"},{code:"SW6621",name:"Emotional",r:198,g:95,b:71,hex:"C65F47"},{code:"SW6622",name:"Hearty Orange",r:180,g:75,b:52,hex:"B44B34"},{code:"SW6624",name:"Peach Blossom",r:243,g:208,b:189,hex:"F3D0BD"},{code:"SW6625",name:"Certain Peach",r:242,g:189,b:162,hex:"F2BDA2"},{code:"SW6626",name:"Sunset",r:226,g:148,b:111,hex:"E2946F"},{code:"SW6627",name:"Emberglow",r:214,g:124,b:86,hex:"D67C56"},{code:"SW6628",name:"Robust Orange",r:196,g:99,b:62,hex:"C4633E"},{code:"SW6629",name:"Jalape�o",r:177,g:83,b:60,hex:"B1533C"},{code:"SW6631",name:"Naive Peach",r:243,g:211,b:191,hex:"F3D3BF"},{code:"SW6632",name:"Neighborly Peach",r:243,g:193,b:163,hex:"F3C1A3"},{code:"SW6633",name:"Inventive Orange",r:232,g:157,b:111,hex:"E89D6F"},{code:"SW6634",name:"Copper Harbor",r:213,g:126,b:82,hex:"D57E52"},{code:"SW6635",name:"Determined Orange",r:197,g:102,b:57,hex:"C56639"},{code:"SW6636",name:"Husky Orange",r:187,g:97,b:62,hex:"BB613E"},{code:"SW6638",name:"Flattering Peach",r:244,g:211,b:179,hex:"F4D3B3"},{code:"SW6639",name:"Avid Apricot",r:244,g:198,b:159,hex:"F4C69F"},{code:"SW6640",name:"Tangerine",r:242,g:172,b:120,hex:"F2AC78"},{code:"SW6641",name:"Outgoing Orange",r:230,g:149,b:95,hex:"E6955F"},{code:"SW6642",name:"Rhumba Orange",r:203,g:120,b:65,hex:"CB7841"},{code:"SW6643",name:"Yam",r:195,g:111,b:62,hex:"C36F3E"},{code:"SW6644",name:"Champagne",r:242,g:227,b:206,hex:"F2E3CE"},{code:"SW6652",name:"Flan",r:244,g:212,b:175,hex:"F4D4AF"},{code:"SW6653",name:"Delicious Melon",r:245,g:200,b:148,hex:"F5C894"},{code:"SW6654",name:"Surprise Amber",r:239,g:181,b:122,hex:"EFB57A"},{code:"SW6655",name:"Adventure Orange",r:230,g:159,b:95,hex:"E69F5F"},{code:"SW6656",name:"Serape",r:216,g:139,b:77,hex:"D88B4D"},{code:"SW6657",name:"Amber Wave",r:210,g:130,b:64,hex:"D28240"},{code:"SW6658",name:"Welcome White",r:243,g:227,b:202,hex:"F3E3CA"},{code:"SW6659",name:"Captivating Cream",r:244,g:217,b:177,hex:"F4D9B1"},{code:"SW6660",name:"Honey Blush",r:245,g:207,b:155,hex:"F5CF9B"},{code:"SW6661",name:"Papaya",r:239,g:185,b:123,hex:"EFB97B"},{code:"SW6662",name:"Summer Day",r:234,g:170,b:98,hex:"EAAA62"},{code:"SW6663",name:"Saffron Thread",r:223,g:152,b:78,hex:"DF984E"},{code:"SW6664",name:"Marigold",r:210,g:130,b:51,hex:"D28233"},{code:"SW6665",name:"Gardenia",r:243,g:226,b:201,hex:"F3E2C9"},{code:"SW6666",name:"Enjoyable Yellow",r:245,g:214,b:169,hex:"F5D6A9"},{code:"SW6667",name:"Afterglow",r:246,g:205,b:142,hex:"F6CD8E"},{code:"SW6668",name:"Sunrise",r:244,g:191,b:119,hex:"F4BF77"},{code:"SW6669",name:"Yarrow",r:235,g:173,b:94,hex:"EBAD5E"},{code:"SW6670",name:"Gold Crest",r:223,g:153,b:56,hex:"DF9938"},{code:"SW6671",name:"Curry",r:216,g:143,b:50,hex:"D88F32"},{code:"SW6672",name:"Morning Sun",r:243,g:230,b:206,hex:"F3E6CE"},{code:"SW6673",name:"Banana Cream",r:245,g:222,b:175,hex:"F5DEAF"},{code:"SW6674",name:"Jonquil",r:247,g:211,b:145,hex:"F7D391"},{code:"SW6675",name:"Afternoon",r:251,g:203,b:120,hex:"FBCB78"},{code:"SW6676",name:"Butterfield",r:247,g:190,b:91,hex:"F7BE5B"},{code:"SW6677",name:"Goldenrod",r:242,g:175,b:70,hex:"F2AF46"},{code:"SW6678",name:"Sunflower",r:227,g:154,b:51,hex:"E39A33"},{code:"SW6679",name:"Full Moon",r:244,g:227,b:188,hex:"F4E3BC"},{code:"SW6680",name:"Friendly Yellow",r:245,g:224,b:177,hex:"F5E0B1"},{code:"SW6681",name:"Butter Up",r:246,g:221,b:163,hex:"F6DDA3"},{code:"SW6682",name:"June Day",r:246,g:201,b:115,hex:"F6C973"},{code:"SW6683",name:"Bee",r:241,g:186,b:85,hex:"F1BA55"},{code:"SW6684",name:"Brittlebush",r:234,g:174,b:71,hex:"EAAE47"},{code:"SW6685",name:"Trinket",r:214,g:152,b:53,hex:"D69835"},{code:"SW6686",name:"Lemon Chiffon",r:245,g:229,b:188,hex:"F5E5BC"},{code:"SW6687",name:"Lantern Light",r:244,g:225,b:174,hex:"F4E1AE"},{code:"SW6688",name:"Solaria",r:245,g:214,b:143,hex:"F5D68F"},{code:"SW6689",name:"Overjoy",r:238,g:194,b:95,hex:"EEC25F"},{code:"SW6690",name:"Gambol Gold",r:225,g:176,b:71,hex:"E1B047"},{code:"SW6691",name:"Glitzy Gold",r:214,g:160,b:43,hex:"D6A02B"},{code:"SW6692",name:"Auric",r:196,g:137,b:25,hex:"C48919"},{code:"SW6693",name:"Lily",r:243,g:232,b:194,hex:"F3E8C2"},{code:"SW6694",name:"Glad Yellow",r:245,g:225,b:172,hex:"F5E1AC"},{code:"SW6695",name:"Midday",r:247,g:215,b:138,hex:"F7D78A"},{code:"SW6696",name:"Quilt Gold",r:234,g:195,b:101,hex:"EAC365"},{code:"SW6697",name:"Nugget",r:219,g:176,b:74,hex:"DBB04A"},{code:"SW6698",name:"Kingdom Gold",r:209,g:164,b:54,hex:"D1A436"},{code:"SW6699",name:"Crispy Gold",r:196,g:152,b:50,hex:"C49832"},{code:"SW6700",name:"Daybreak",r:243,g:234,b:198,hex:"F3EAC6"},{code:"SW6701",name:"Moonraker",r:238,g:227,b:178,hex:"EEE3B2"},{code:"SW6702",name:"Lively Yellow",r:230,g:216,b:142,hex:"E6D88E"},{code:"SW6703",name:"Frolic",r:217,g:198,b:97,hex:"D9C661"},{code:"SW6704",name:"Hep Green",r:196,g:177,b:70,hex:"C4B146"},{code:"SW6705",name:"High Strung",r:172,g:152,b:37,hex:"AC9825"},{code:"SW6706",name:"Offbeat Green",r:156,g:139,b:31,hex:"9C8B1F"},{code:"SW6708",name:"Springtime",r:233,g:229,b:179,hex:"E9E5B3"},{code:"SW6709",name:"Gleeful",r:218,g:215,b:144,hex:"DAD790"},{code:"SW6710",name:"M�lange Green",r:196,g:196,b:118,hex:"C4C476"},{code:"SW6711",name:"Parakeet",r:180,g:176,b:90,hex:"B4B05A"},{code:"SW6712",name:"Luau Green",r:152,g:151,b:70,hex:"989746"},{code:"SW6713",name:"Verdant",r:132,g:126,b:53,hex:"847E35"},{code:"SW6715",name:"Lime Granita",r:220,g:225,b:184,hex:"DCE1B8"},{code:"SW6716",name:"Dancing Green",r:197,g:205,b:143,hex:"C5CD8F"},{code:"SW6717",name:"Lime Rickey",r:175,g:185,b:106,hex:"AFB96A"},{code:"SW6718",name:"Overt Green",r:151,g:165,b:84,hex:"97A554"},{code:"SW6719",name:"Gecko",r:122,g:136,b:51,hex:"7A8833"},{code:"SW6720",name:"Paradise",r:108,g:123,b:48,hex:"6C7B30"},{code:"SW6722",name:"Cucumber",r:211,g:223,b:195,hex:"D3DFC3"},{code:"SW6723",name:"Jardin",r:189,g:208,b:171,hex:"BDD0AB"},{code:"SW6724",name:"Mesclun Green",r:157,g:182,b:130,hex:"9DB682"},{code:"SW6725",name:"Pickle",r:133,g:161,b:106,hex:"85A16A"},{code:"SW6726",name:"Talipot Palm",r:100,g:129,b:73,hex:"648149"},{code:"SW6727",name:"Houseplant",r:88,g:113,b:63,hex:"58713F"},{code:"SW6729",name:"Lacewing",r:215,g:227,b:202,hex:"D7E3CA"},{code:"SW6730",name:"Romaine",r:192,g:210,b:173,hex:"C0D2AD"},{code:"SW6731",name:"Picnic",r:153,g:194,b:133,hex:"99C285"},{code:"SW6732",name:"Organic Green",r:127,g:172,b:110,hex:"7FAC6E"},{code:"SW6733",name:"Grasshopper",r:79,g:133,b:74,hex:"4F854A"},{code:"SW6734",name:"Espalier",r:47,g:95,b:58,hex:"2F5F3A"},{code:"SW6736",name:"Jocular Green",r:204,g:226,b:202,hex:"CCE2CA"},{code:"SW6737",name:"Kiwi",r:174,g:210,b:176,hex:"AED2B0"},{code:"SW6738",name:"Vegan",r:142,g:194,b:152,hex:"8EC298"},{code:"SW6739",name:"Eco Green",r:104,g:166,b:120,hex:"68A678"},{code:"SW6740",name:"Kilkenny",r:73,g:133,b:85,hex:"498555"},{code:"SW6741",name:"Derbyshire",r:36,g:94,b:54,hex:"245E36"},{code:"SW6743",name:"Mint Condition",r:209,g:227,b:210,hex:"D1E3D2"},{code:"SW6744",name:"Reclining Green",r:183,g:215,b:191,hex:"B7D7BF"},{code:"SW6745",name:"Lark Green",r:138,g:193,b:161,hex:"8AC1A1"},{code:"SW6746",name:"Julep",r:87,g:170,b:128,hex:"57AA80"},{code:"SW6747",name:"Argyle",r:52,g:138,b:93,hex:"348A5D"},{code:"SW6748",name:"Greens",r:1,g:104,b:68,hex:"016844"},{code:"SW6749",name:"Embellished Blue",r:215,g:235,b:226,hex:"D7EBE2"},{code:"SW6750",name:"Waterfall",r:192,g:227,b:218,hex:"C0E3DA"},{code:"SW6751",name:"Refresh",r:161,g:212,b:200,hex:"A1D4C8"},{code:"SW6752",name:"Larchmere",r:112,g:186,b:167,hex:"70BAA7"},{code:"SW6753",name:"Jargon Jade",r:83,g:163,b:143,hex:"53A38F"},{code:"SW6754",name:"Ionian",r:54,g:137,b:118,hex:"368976"},{code:"SW6755",name:"Starboard",r:1,g:108,b:79,hex:"016C4F"},{code:"SW6757",name:"Tame Teal",r:193,g:230,b:223,hex:"C1E6DF"},{code:"SW6758",name:"Aqueduct",r:161,g:213,b:203,hex:"A1D5CB"},{code:"SW6759",name:"Cooled Blue",r:117,g:185,b:174,hex:"75B9AE"},{code:"SW6760",name:"Rivulet",r:97,g:168,b:157,hex:"61A89D"},{code:"SW6761",name:"Thermal Spring",r:59,g:140,b:128,hex:"3B8C80"},{code:"SW6762",name:"Poseidon",r:1,g:109,b:96,hex:"016D60"},{code:"SW6764",name:"Swimming",r:194,g:229,b:229,hex:"C2E5E5"},{code:"SW6765",name:"Spa",r:167,g:220,b:220,hex:"A7DCDC"},{code:"SW6766",name:"Mariner",r:110,g:194,b:196,hex:"6EC2C4"},{code:"SW6767",name:"Aquarium",r:58,g:169,b:174,hex:"3AA9AE"},{code:"SW6768",name:"Gulfstream",r:1,g:133,b:139,hex:"01858B"},{code:"SW6769",name:"Maxi Teal",r:1,g:116,b:120,hex:"017478"},{code:"SW6771",name:"Bathe Blue",r:194,g:224,b:227,hex:"C2E0E3"},{code:"SW6772",name:"Cay",r:166,g:208,b:214,hex:"A6D0D6"},{code:"SW6773",name:"Rapture Blue",r:125,g:193,b:203,hex:"7DC1CB"},{code:"SW6774",name:"Freshwater",r:77,g:166,b:178,hex:"4DA6B2"},{code:"SW6775",name:"Briny",r:8,g:128,b:142,hex:"08808E"},{code:"SW6776",name:"Blue Nile",r:1,g:113,b:126,hex:"01717E"},{code:"SW6778",name:"Aviary Blue",r:198,g:227,b:232,hex:"C6E3E8"},{code:"SW6779",name:"Liquid Blue",r:166,g:212,b:222,hex:"A6D4DE"},{code:"SW6780",name:"Nautilus",r:113,g:184,b:199,hex:"71B8C7"},{code:"SW6781",name:"Jamaica Bay",r:52,g:163,b:182,hex:"34A3B6"},{code:"SW6782",name:"Cruising",r:1,g:132,b:152,hex:"018498"},{code:"SW6783",name:"Amalfi",r:1,g:110,b:133,hex:"016E85"},{code:"SW6784",name:"Bravo Blue",r:211,g:231,b:233,hex:"D3E7E9"},{code:"SW6785",name:"Quench Blue",r:180,g:224,b:231,hex:"B4E0E7"},{code:"SW6786",name:"Cloudless",r:143,g:208,b:221,hex:"8FD0DD"},{code:"SW6787",name:"Fountain",r:86,g:181,b:202,hex:"56B5CA"},{code:"SW6788",name:"Capri",r:1,g:160,b:184,hex:"01A0B8"},{code:"SW6789",name:"Blue Mosque",r:1,g:129,b:158,hex:"01819E"},{code:"SW6790",name:"Adriatic Sea",r:1,g:96,b:129,hex:"016081"},{code:"SW6792",name:"Minor Blue",r:183,g:223,b:232,hex:"B7DFE8"},{code:"SW6793",name:"Bluebell",r:162,g:213,b:231,hex:"A2D5E7"},{code:"SW6794",name:"Flyway",r:93,g:179,b:212,hex:"5DB3D4"},{code:"SW6795",name:"Major Blue",r:40,g:158,b:196,hex:"289EC4"},{code:"SW6796",name:"Blue Plate",r:1,g:124,b:167,hex:"017CA7"},{code:"SW6797",name:"Jay Blue",r:1,g:93,b:135,hex:"015D87"},{code:"SW6798",name:"Iceberg",r:214,g:228,b:231,hex:"D6E4E7"},{code:"SW6799",name:"Soar",r:195,g:223,b:232,hex:"C3DFE8"},{code:"SW6800",name:"Something Blue",r:176,g:214,b:230,hex:"B0D6E6"},{code:"SW6801",name:"Regale Blue",r:125,g:181,b:211,hex:"7DB5D3"},{code:"SW6802",name:"Jacaranda",r:90,g:158,b:192,hex:"5A9EC0"},{code:"SW6803",name:"Danube",r:35,g:119,b:162,hex:"2377A2"},{code:"SW6804",name:"Dignity Blue",r:9,g:76,b:115,hex:"094C73"},{code:"SW6806",name:"Rhythmic Blue",r:204,g:219,b:229,hex:"CCDBE5"},{code:"SW6807",name:"Wondrous Blue",r:184,g:205,b:221,hex:"B8CDDD"},{code:"SW6808",name:"Celestial",r:151,g:179,b:208,hex:"97B3D0"},{code:"SW6809",name:"Lobelia",r:116,g:152,b:190,hex:"7498BE"},{code:"SW6810",name:"Lupine",r:78,g:115,b:159,hex:"4E739F"},{code:"SW6811",name:"Honorable Blue",r:22,g:69,b:118,hex:"164576"},{code:"SW6813",name:"Wishful Blue",r:216,g:221,b:230,hex:"D8DDE6"},{code:"SW6814",name:"Breathtaking",r:199,g:209,b:226,hex:"C7D1E2"},{code:"SW6815",name:"Awesome Violet",r:167,g:178,b:212,hex:"A7B2D4"},{code:"SW6816",name:"Dahlia",r:139,g:152,b:196,hex:"8B98C4"},{code:"SW6817",name:"Gentian",r:101,g:114,b:165,hex:"6572A5"},{code:"SW6818",name:"Valiant Violet",r:62,g:67,b:113,hex:"3E4371"},{code:"SW6820",name:"Inspired Lilac",r:223,g:217,b:228,hex:"DFD9E4"},{code:"SW6821",name:"Potentially Purple",r:209,g:203,b:223,hex:"D1CBDF"},{code:"SW6822",name:"Wisteria",r:189,g:180,b:212,hex:"BDB4D4"},{code:"SW6823",name:"Brave Purple",r:150,g:141,b:184,hex:"968DB8"},{code:"SW6824",name:"Forget-Me-Not",r:113,g:105,b:152,hex:"716998"},{code:"SW6825",name:"Izmir Purple",r:77,g:66,b:110,hex:"4D426E"},{code:"SW6827",name:"Elation",r:223,g:220,b:229,hex:"DFDCE5"},{code:"SW6828",name:"Rhapsody Lilac",r:210,g:200,b:221,hex:"D2C8DD"},{code:"SW6829",name:"Magical",r:192,g:175,b:208,hex:"C0AFD0"},{code:"SW6830",name:"Kismet",r:161,g:138,b:183,hex:"A18AB7"},{code:"SW6831",name:"Clematis",r:126,g:101,b:150,hex:"7E6596"},{code:"SW6832",name:"Impulsive Purple",r:98,g:73,b:119,hex:"624977"},{code:"SW6834",name:"Spangle",r:229,g:219,b:229,hex:"E5DBE5"},{code:"SW6835",name:"Euphoric Lilac",r:218,g:199,b:218,hex:"DAC7DA"},{code:"SW6836",name:"Novel Lilac",r:194,g:164,b:194,hex:"C2A4C2"},{code:"SW6837",name:"Baroness",r:167,g:133,b:167,hex:"A785A7"},{code:"SW6838",name:"Vigorous Violet",r:124,g:90,b:126,hex:"7C5A7E"},{code:"SW6839",name:"Kimono Violet",r:93,g:57,b:95,hex:"5D395F"},{code:"SW6840",name:"Exuberant Pink",r:181,g:77,b:127,hex:"B54D7F"},{code:"SW6841",name:"Dynamo",r:149,g:61,b:104,hex:"953D68"},{code:"SW6842",name:"Forward Fuchsia",r:146,g:52,b:91,hex:"92345B"},{code:"SW6843",name:"Hot",r:172,g:67,b:98,hex:"AC4362"},{code:"SW6855",name:"Dragon Fruit",r:204,g:97,b:127,hex:"CC617F"},{code:"SW6860",name:"Eros Pink",r:200,g:79,b:104,hex:"C84F68"},{code:"SW6861",name:"Radish",r:164,g:46,b:65,hex:"A42E41"},{code:"SW6862",name:"Cherries Jubilee",r:171,g:60,b:81,hex:"AB3C51"},{code:"SW6866",name:"Heartthrob",r:168,g:46,b:51,hex:"A82E33"},{code:"SW6868",name:"Real Red",r:191,g:45,b:50,hex:"BF2D32"},{code:"SW6869",name:"Stop",r:195,g:58,b:54,hex:"C33A36"},{code:"SW6871",name:"Positive Red",r:173,g:44,b:52,hex:"AD2C34"},{code:"SW6876",name:"Comical Coral",r:243,g:209,b:200,hex:"F3D1C8"},{code:"SW6881",name:"Cayenne",r:192,g:77,b:53,hex:"C04D35"},{code:"SW6883",name:"Raucous Orange",r:195,g:85,b:48,hex:"C35530"},{code:"SW6884",name:"Obstinate Orange",r:215,g:85,b:42,hex:"D7552A"},{code:"SW6885",name:"Knockout Orange",r:225,g:111,b:62,hex:"E16F3E"},{code:"SW6886",name:"Invigorate",r:228,g:114,b:55,hex:"E47237"},{code:"SW6887",name:"Navel",r:236,g:132,b:48,hex:"EC8430"},{code:"SW6890",name:"Osage Orange",r:244,g:160,b:69,hex:"F4A045"},{code:"SW6892",name:"Carnival",r:235,g:136,b:44,hex:"EB882C"},{code:"SW6896",name:"Sol�",r:247,g:221,b:161,hex:"F7DDA1"},{code:"SW6900",name:"Optimistic Yellow",r:245,g:225,b:166,hex:"F5E1A6"},{code:"SW6901",name:"Daffodil",r:250,g:217,b:122,hex:"FAD97A"},{code:"SW6902",name:"Decisive Yellow",r:253,g:204,b:78,hex:"FDCC4E"},{code:"SW6903",name:"Cheerful",r:255,g:199,b:35,hex:"FFC723"},{code:"SW6904",name:"Gusto Gold",r:248,g:172,b:29,hex:"F8AC1D"},{code:"SW6905",name:"Goldfinch",r:253,g:183,b:2,hex:"FDB702"},{code:"SW6907",name:"Forsythia",r:255,g:200,b:1,hex:"FFC801"},{code:"SW6908",name:"Fun Yellow",r:247,g:229,b:148,hex:"F7E594"},{code:"SW6909",name:"Lemon Twist",r:254,g:217,b:93,hex:"FED95D"},{code:"SW6910",name:"Daisy",r:254,g:211,b:64,hex:"FED340"},{code:"SW6911",name:"Confident Yellow",r:254,g:203,b:1,hex:"FECB01"},{code:"SW6913",name:"Funky Yellow",r:237,g:210,b:111,hex:"EDD26F"},{code:"SW6914",name:"Eye Catching",r:221,g:184,b:53,hex:"DDB835"},{code:"SW6915",name:"Citronella",r:203,g:169,b:1,hex:"CBA901"},{code:"SW6918",name:"Humorous Green",r:198,g:184,b:54,hex:"C6B836"},{code:"SW6920",name:"Center Stage",r:178,g:194,b:22,hex:"B2C216"},{code:"SW6921",name:"Electric Lime",r:154,g:186,b:37,hex:"9ABA25"},{code:"SW6924",name:"Direct Green",r:63,g:138,b:36,hex:"3F8A24"},{code:"SW6925",name:"Envy",r:53,g:140,b:63,hex:"358C3F"},{code:"SW6926",name:"Lucky Green",r:35,g:134,b:82,hex:"238652"},{code:"SW6927",name:"Greenbelt",r:1,g:114,b:68,hex:"017244"},{code:"SW6928",name:"Green Vibes",r:212,g:231,b:195,hex:"D4E7C3"},{code:"SW6937",name:"Tantalizing Teal",r:135,g:220,b:206,hex:"87DCCE"},{code:"SW6941",name:"Nifty Turquoise",r:1,g:145,b:135,hex:"019187"},{code:"SW6942",name:"Splashy",r:1,g:145,b:150,hex:"019196"},{code:"SW6943",name:"Intense Teal",r:1,g:118,b:128,hex:"017680"},{code:"SW6950",name:"Calypso",r:1,g:176,b:187,hex:"01B0BB"},{code:"SW6957",name:"Undercool",r:127,g:195,b:225,hex:"7FC3E1"},{code:"SW6958",name:"Dynamic Blue",r:1,g:146,b:198,hex:"0192C6"},{code:"SW6959",name:"Blue Chip",r:1,g:110,b:167,hex:"016EA7"},{code:"SW6965",name:"Hyper Blue",r:1,g:95,b:151,hex:"015F97"},{code:"SW6966",name:"Blueblood",r:1,g:80,b:134,hex:"015086"},{code:"SW6967",name:"Frank Blue",r:34,g:82,b:136,hex:"225288"},{code:"SW6968",name:"Hyacinth Tint",r:194,g:203,b:224,hex:"C2CBE0"},{code:"SW6971",name:"Morning Glory",r:60,g:76,b:128,hex:"3C4C80"},{code:"SW6973",name:"Free Spirit",r:202,g:178,b:210,hex:"CAB2D2"},{code:"SW6981",name:"Passionate Purple",r:121,g:84,b:132,hex:"795484"},{code:"SW6982",name:"African Violet",r:102,g:83,b:133,hex:"665385"},{code:"SW6983",name:"Fully Purple",r:81,g:76,b:126,hex:"514C7E"},{code:"SW6987",name:"Jitterbug Jade",r:1,g:157,b:110,hex:"019D6E"},{code:"SW6988",name:"Bohemian Black",r:59,g:55,b:60,hex:"3B373C"},{code:"SW6989",name:"Domino",r:53,g:51,b:55,hex:"353337"},{code:"SW6990",name:"Caviar",r:49,g:48,b:49,hex:"313031"},{code:"SW6991",name:"Black Magic",r:50,g:49,b:50,hex:"323132"},{code:"SW6992",name:"Inkwell",r:49,g:54,b:58,hex:"31363A"},{code:"SW6993",name:"Black of Night",r:50,g:54,b:57,hex:"323639"},{code:"SW6994",name:"Greenblack",r:55,g:58,b:58,hex:"373A3A"},{code:"SW7000",name:"Ibis White",r:242,g:236,b:230,hex:"F2ECE6"},{code:"SW7001",name:"Marshmallow",r:238,g:233,b:224,hex:"EEE9E0"},{code:"SW7002",name:"Downy",r:239,g:232,b:221,hex:"EFE8DD"},{code:"SW7003",name:"Toque White",r:231,g:226,b:218,hex:"E7E2DA"},{code:"SW7004",name:"Snowbound",r:237,g:234,b:229,hex:"EDEAE5"},{code:"SW7005",name:"Pure White",r:237,g:236,b:230,hex:"EDECE6"},{code:"SW7006",name:"Extra White",r:238,g:239,b:234,hex:"EEEFEA"},{code:"SW7007",name:"Ceiling Bright White",r:233,g:235,b:231,hex:"E9EBE7"},{code:"SW7008",name:"Alabaster",r:237,g:234,b:224,hex:"EDEAE0"},{code:"SW7009",name:"Pearly White",r:232,g:227,b:217,hex:"E8E3D9"},{code:"SW7010",name:"White Duck",r:229,g:223,b:210,hex:"E5DFD2"},{code:"SW7011",name:"Natural Choice",r:227,g:222,b:208,hex:"E3DED0"},{code:"SW7012",name:"Creamy",r:239,g:232,b:219,hex:"EFE8DB"},{code:"SW7013",name:"Ivory Lace",r:236,g:229,b:216,hex:"ECE5D8"},{code:"SW7014",name:"Eider White",r:226,g:222,b:216,hex:"E2DED8"},{code:"SW7015",name:"Repose Gray",r:204,g:201,b:192,hex:"CCC9C0"},{code:"SW7016",name:"Mindful Gray",r:188,g:183,b:173,hex:"BCB7AD"},{code:"SW7017",name:"Dorian Gray",r:172,g:167,b:158,hex:"ACA79E"},{code:"SW7018",name:"Dovetail",r:144,g:138,b:131,hex:"908A83"},{code:"SW7019",name:"Gauntlet Gray",r:120,g:115,b:110,hex:"78736E"},{code:"SW7020",name:"Black Fox",r:79,g:72,b:66,hex:"4F4842"},{code:"SW7021",name:"Simple White",r:223,g:217,b:210,hex:"DFD9D2"},{code:"SW7022",name:"Alpaca",r:204,g:197,b:189,hex:"CCC5BD"},{code:"SW7023",name:"Requisite Gray",r:185,g:178,b:169,hex:"B9B2A9"},{code:"SW7024",name:"Functional Gray",r:171,g:163,b:154,hex:"ABA39A"},{code:"SW7025",name:"Backdrop",r:134,g:122,b:111,hex:"867A6F"},{code:"SW7026",name:"Griffin",r:111,g:100,b:89,hex:"6F6459"},{code:"SW7027",name:"Hickory Smoke",r:86,g:69,b:55,hex:"564537"},{code:"SW7028",name:"Incredible White",r:227,g:222,b:215,hex:"E3DED7"},{code:"SW7029",name:"Agreeable Gray",r:209,g:203,b:193,hex:"D1CBC1"},{code:"SW7030",name:"Anew Gray",r:191,g:182,b:170,hex:"BFB6AA"},{code:"SW7031",name:"Mega Greige",r:173,g:162,b:149,hex:"ADA295"},{code:"SW7032",name:"Warm Stone",r:136,g:123,b:108,hex:"887B6C"},{code:"SW7033",name:"Brainstorm Bronze",r:116,g:104,b:90,hex:"74685A"},{code:"SW7034",name:"Status Bronze",r:92,g:77,b:60,hex:"5C4D3C"},{code:"SW7035",name:"Aesthetic White",r:227,g:221,b:211,hex:"E3DDD3"},{code:"SW7036",name:"Accessible Beige",r:209,g:199,b:184,hex:"D1C7B8"},{code:"SW7037",name:"Balanced Beige",r:192,g:178,b:162,hex:"C0B2A2"},{code:"SW7038",name:"Tony Taupe",r:177,g:162,b:144,hex:"B1A290"},{code:"SW7039",name:"Virtual Taupe",r:138,g:122,b:106,hex:"8A7A6A"},{code:"SW7040",name:"Smokehouse",r:113,g:99,b:84,hex:"716354"},{code:"SW7041",name:"Van Dyke Brown",r:86,g:69,b:54,hex:"564536"},{code:"SW7042",name:"Shoji White",r:230,g:223,b:211,hex:"E6DFD3"},{code:"SW7043",name:"Worldly Gray",r:206,g:198,b:187,hex:"CEC6BB"},{code:"SW7044",name:"Amazing Gray",r:190,g:181,b:169,hex:"BEB5A9"},{code:"SW7045",name:"Intellectual Gray",r:168,g:160,b:147,hex:"A8A093"},{code:"SW7046",name:"Anonymous",r:129,g:122,b:110,hex:"817A6E"},{code:"SW7047",name:"Porpoise",r:107,g:100,b:91,hex:"6B645B"},{code:"SW7048",name:"Urbane Bronze",r:84,g:80,b:74,hex:"54504A"},{code:"SW7049",name:"Nuance",r:226,g:224,b:214,hex:"E2E0D6"},{code:"SW7050",name:"Useful Gray",r:207,g:202,b:189,hex:"CFCABD"},{code:"SW7051",name:"Analytical Gray",r:191,g:182,b:167,hex:"BFB6A7"},{code:"SW7052",name:"Gray Area",r:175,g:166,b:150,hex:"AFA696"},{code:"SW7053",name:"Adaptive Shade",r:134,g:126,b:112,hex:"867E70"},{code:"SW7054",name:"Oak Leaf Brown",r:100,g:90,b:75,hex:"645A4B"},{code:"SW7055",name:"Enduring Bronze",r:85,g:76,b:62,hex:"554C3E"},{code:"SW7056",name:"Reserved White",r:224,g:224,b:217,hex:"E0E0D9"},{code:"SW7057",name:"Silver Strand",r:200,g:203,b:196,hex:"C8CBC4"},{code:"SW7058",name:"Magnetic Gray",r:178,g:181,b:175,hex:"B2B5AF"},{code:"SW7059",name:"Unusual Gray",r:163,g:167,b:160,hex:"A3A7A0"},{code:"SW7060",name:"Attitude Gray",r:124,g:125,b:117,hex:"7C7D75"},{code:"SW7061",name:"Night Owl",r:99,g:101,b:95,hex:"63655F"},{code:"SW7062",name:"Rock Bottom",r:72,g:76,b:73,hex:"484C49"},{code:"SW7063",name:"Nebulous White",r:222,g:223,b:220,hex:"DEDFDC"},{code:"SW7064",name:"Passive",r:203,g:204,b:201,hex:"CBCCC9"},{code:"SW7065",name:"Argos",r:189,g:189,b:183,hex:"BDBDB7"},{code:"SW7066",name:"Gray Matters",r:167,g:168,b:162,hex:"A7A8A2"},{code:"SW7067",name:"Cityscape",r:127,g:129,b:126,hex:"7F817E"},{code:"SW7068",name:"Grizzle Gray",r:99,g:101,b:98,hex:"636562"},{code:"SW7069",name:"Iron Ore",r:67,g:67,b:65,hex:"434341"},{code:"SW7070",name:"Site White",r:220,g:222,b:220,hex:"DCDEDC"},{code:"SW7071",name:"Gray Screen",r:198,g:202,b:202,hex:"C6CACA"},{code:"SW7072",name:"Online",r:176,g:181,b:181,hex:"B0B5B5"},{code:"SW7073",name:"Network Gray",r:160,g:165,b:167,hex:"A0A5A7"},{code:"SW7074",name:"Software",r:127,g:132,b:134,hex:"7F8486"},{code:"SW7075",name:"Web Gray",r:97,g:102,b:105,hex:"616669"},{code:"SW7076",name:"Cyberspace",r:68,g:72,b:77,hex:"44484D"},{code:"SW7077",name:"Original White",r:226,g:222,b:219,hex:"E2DEDB"},{code:"SW7078",name:"Minute Mauve",r:207,g:201,b:200,hex:"CFC9C8"},{code:"SW7079",name:"Ponder",r:188,g:182,b:182,hex:"BCB6B6"},{code:"SW7080",name:"Quest Gray",r:173,g:165,b:165,hex:"ADA5A5"},{code:"SW7081",name:"Sensuous Gray",r:131,g:125,b:127,hex:"837D7F"},{code:"SW7082",name:"Stunning Shade",r:103,g:96,b:100,hex:"676064"},{code:"SW7083",name:"Darkroom",r:68,g:62,b:64,hex:"443E40"},{code:"SW7100",name:"Arcade White",r:243,g:238,b:231,hex:"F3EEE7"},{code:"SW7101",name:"Futon",r:237,g:230,b:219,hex:"EDE6DB"},{code:"SW7102",name:"White Flour",r:244,g:239,b:229,hex:"F4EFE5"},{code:"SW7103",name:"Whitetail",r:244,g:239,b:228,hex:"F4EFE4"},{code:"SW7104",name:"Cotton White",r:247,g:239,b:227,hex:"F7EFE3"},{code:"SW7105",name:"Paperwhite",r:247,g:239,b:222,hex:"F7EFDE"},{code:"SW7106",name:"Honied White",r:248,g:238,b:219,hex:"F8EEDB"},{code:"SW7501",name:"Threshold Taupe",r:172,g:154,b:138,hex:"AC9A8A"},{code:"SW7502",name:"Dry Dock",r:161,g:141,b:125,hex:"A18D7D"},{code:"SW7503",name:"Sticks & Stones",r:164,g:150,b:137,hex:"A49689"},{code:"SW7504",name:"Keystone Gray",r:158,g:146,b:132,hex:"9E9284"},{code:"SW7505",name:"Manor House",r:102,g:93,b:87,hex:"665D57"},{code:"SW7506",name:"Loggia",r:196,g:183,b:165,hex:"C4B7A5"},{code:"SW7507",name:"Stone Lion",r:179,g:164,b:145,hex:"B3A491"},{code:"SW7508",name:"Tavern Taupe",r:156,g:138,b:121,hex:"9C8A79"},{code:"SW7509",name:"Tiki Hut",r:130,g:111,b:94,hex:"826F5E"},{code:"SW7510",name:"Chateau Brown",r:91,g:75,b:68,hex:"5B4B44"},{code:"SW7511",name:"Bungalow Beige",r:205,g:191,b:176,hex:"CDBFB0"},{code:"SW7512",name:"Pavilion Beige",r:197,g:182,b:164,hex:"C5B6A4"},{code:"SW7513",name:"Sanderling",r:167,g:149,b:130,hex:"A79582"},{code:"SW7514",name:"Foothills",r:130,g:116,b:102,hex:"827466"},{code:"SW7515",name:"Homestead Brown",r:110,g:95,b:83,hex:"6E5F53"},{code:"SW7516",name:"Kestrel White",r:224,g:214,b:200,hex:"E0D6C8"},{code:"SW7517",name:"Rivers Edge",r:219,g:206,b:189,hex:"DBCEBD"},{code:"SW7518",name:"Beach House",r:201,g:178,b:156,hex:"C9B29C"},{code:"SW7519",name:"Mexican Sand",r:175,g:151,b:129,hex:"AF9781"},{code:"SW7520",name:"Plantation Shutters",r:106,g:81,b:67,hex:"6A5143"},{code:"SW7521",name:"Dormer Brown",r:173,g:148,b:124,hex:"AD947C"},{code:"SW7522",name:"Meadowlark",r:159,g:130,b:103,hex:"9F8267"},{code:"SW7523",name:"Burnished Brandy",r:124,g:92,b:67,hex:"7C5C43"},{code:"SW7524",name:"Dhurrie Beige",r:202,g:186,b:168,hex:"CABAA8"},{code:"SW7525",name:"Tree Branch",r:138,g:115,b:98,hex:"8A7362"},{code:"SW7526",name:"Maison Blanche",r:223,g:210,b:191,hex:"DFD2BF"},{code:"SW7527",name:"Nantucket Dune",r:208,g:191,b:170,hex:"D0BFAA"},{code:"SW7528",name:"Windsor Greige",r:196,g:180,b:156,hex:"C4B49C"},{code:"SW7529",name:"Sand Beach",r:212,g:197,b:173,hex:"D4C5AD"},{code:"SW7530",name:"Barcelona Beige",r:196,g:179,b:156,hex:"C4B39C"},{code:"SW7531",name:"Canvas Tan",r:220,g:209,b:191,hex:"DCD1BF"},{code:"SW7532",name:"Urban Putty",r:207,g:192,b:171,hex:"CFC0AB"},{code:"SW7533",name:"Khaki Shade",r:192,g:175,b:151,hex:"C0AF97"},{code:"SW7534",name:"Outerbanks",r:183,g:164,b:139,hex:"B7A48B"},{code:"SW7535",name:"Sandy Ridge",r:161,g:142,b:119,hex:"A18E77"},{code:"SW7536",name:"Bittersweet Stem",r:203,g:180,b:154,hex:"CBB49A"},{code:"SW7537",name:"Irish Cream",r:227,g:210,b:184,hex:"E3D2B8"},{code:"SW7538",name:"Tamarind",r:192,g:165,b:136,hex:"C0A588"},{code:"SW7539",name:"Cork Wedge",r:193,g:169,b:138,hex:"C1A98A"},{code:"SW7540",name:"Artisan Tan",r:176,g:152,b:121,hex:"B09879"},{code:"SW7541",name:"Grecian Ivory",r:216,g:207,b:190,hex:"D8CFBE"},{code:"SW7542",name:"Naturel",r:203,g:192,b:173,hex:"CBC0AD"},{code:"SW7543",name:"Avenue Tan",r:188,g:176,b:153,hex:"BCB099"},{code:"SW7544",name:"Fenland",r:172,g:157,b:131,hex:"AC9D83"},{code:"SW7545",name:"Pier",r:99,g:82,b:61,hex:"63523D"},{code:"SW7546",name:"Prairie Grass",r:177,g:163,b:142,hex:"B1A38E"},{code:"SW7547",name:"Sandbar",r:203,g:191,b:173,hex:"CBBFAD"},{code:"SW7548",name:"Portico",r:187,g:171,b:149,hex:"BBAB95"},{code:"SW7549",name:"Studio Taupe",r:173,g:156,b:133,hex:"AD9C85"},{code:"SW7550",name:"Resort Tan",r:144,g:125,b:102,hex:"907D66"},{code:"SW7551",name:"Greek Villa",r:240,g:236,b:226,hex:"F0ECE2"},{code:"SW7552",name:"Bauhaus Buff",r:231,g:219,b:204,hex:"E7DBCC"},{code:"SW7553",name:"Fragile Beauty",r:231,g:215,b:198,hex:"E7D7C6"},{code:"SW7554",name:"Steamed Milk",r:236,g:225,b:209,hex:"ECE1D1"},{code:"SW7555",name:"Patience",r:226,g:211,b:191,hex:"E2D3BF"},{code:"SW7556",name:"Cr�me",r:244,g:232,b:210,hex:"F4E8D2"},{code:"SW7557",name:"Summer White",r:244,g:233,b:214,hex:"F4E9D6"},{code:"SW7558",name:"Medici Ivory",r:243,g:233,b:215,hex:"F3E9D7"},{code:"SW7559",name:"D�cor White",r:242,g:229,b:207,hex:"F2E5CF"},{code:"SW7560",name:"Impressive Ivory",r:244,g:222,b:195,hex:"F4DEC3"},{code:"SW7561",name:"Lemon Meringue",r:245,g:234,b:204,hex:"F5EACC"},{code:"SW7562",name:"Roman Column",r:246,g:240,b:226,hex:"F6F0E2"},{code:"SW7563",name:"Restful White",r:238,g:232,b:215,hex:"EEE8D7"},{code:"SW7564",name:"Polar Bear",r:232,g:223,b:202,hex:"E8DFCA"},{code:"SW7565",name:"Oyster Bar",r:219,g:208,b:187,hex:"DBD0BB"},{code:"SW7566",name:"Westhighland White",r:243,g:238,b:227,hex:"F3EEE3"},{code:"SW7567",name:"Natural Tan",r:220,g:210,b:195,hex:"DCD2C3"},{code:"SW7568",name:"Neutral Ground",r:226,g:218,b:202,hex:"E2DACA"},{code:"SW7569",name:"Stucco",r:220,g:207,b:186,hex:"DCCFBA"},{code:"SW7570",name:"Egret White",r:223,g:217,b:207,hex:"DFD9CF"},{code:"SW7571",name:"Casa Blanca",r:237,g:225,b:206,hex:"EDE1CE"},{code:"SW7572",name:"Lotus Pod",r:231,g:215,b:194,hex:"E7D7C2"},{code:"SW7573",name:"Eaglet Beige",r:233,g:217,b:192,hex:"E9D9C0"},{code:"SW7574",name:"Echelon Ecru",r:231,g:216,b:190,hex:"E7D8BE"},{code:"SW7575",name:"Chopsticks",r:224,g:209,b:184,hex:"E0D1B8"},{code:"SW7577",name:"Blackberry",r:83,g:54,b:64,hex:"533640"},{code:"SW7578",name:"Borscht",r:114,g:53,b:61,hex:"72353D"},{code:"SW7579",name:"Alaea",r:129,g:88,b:91,hex:"81585B"},{code:"SW7580",name:"Carnelian",r:87,g:62,b:62,hex:"573E3E"},{code:"SW7582",name:"Salute",r:128,g:53,b:50,hex:"803532"},{code:"SW7583",name:"Wild Currant",r:124,g:50,b:57,hex:"7C3239"},{code:"SW7584",name:"Red Theatre",r:110,g:54,b:55,hex:"6E3637"},{code:"SW7585",name:"Sun Dried Tomato",r:105,g:43,b:43,hex:"692B2B"},{code:"SW7586",name:"Stolen Kiss",r:129,g:50,b:53,hex:"813235"},{code:"SW7587",name:"Antique Red",r:159,g:68,b:66,hex:"9F4442"},{code:"SW7588",name:"Show Stopper",r:164,g:46,b:55,hex:"A42E37"},{code:"SW7589",name:"Habanero Chile",r:184,g:71,b:61,hex:"B8473D"},{code:"SW7591",name:"Red Barn",r:124,g:69,b:61,hex:"7C453D"},{code:"SW7592",name:"Crabby Apple",r:117,g:53,b:49,hex:"753531"},{code:"SW7593",name:"Rustic Red",r:112,g:50,b:41,hex:"703229"},{code:"SW7594",name:"Carriage Door",r:110,g:66,b:62,hex:"6E423E"},{code:"SW7595",name:"Sommelier",r:93,g:55,b:54,hex:"5D3736"},{code:"SW7596",name:"Only Natural",r:226,g:211,b:196,hex:"E2D3C4"},{code:"SW7598",name:"Sierra Redwood",r:146,g:78,b:60,hex:"924E3C"},{code:"SW7599",name:"Brick Paver",r:147,g:64,b:47,hex:"93402F"},{code:"SW7600",name:"Bolero",r:144,g:57,b:52,hex:"903934"},{code:"SW7601",name:"Dockside Blue",r:160,g:179,b:188,hex:"A0B3BC"},{code:"SW7602",name:"Indigo Batik",r:62,g:80,b:99,hex:"3E5063"},{code:"SW7603",name:"Poolhouse",r:128,g:149,b:160,hex:"8095A0"},{code:"SW7604",name:"Smoky Blue",r:89,g:110,b:121,hex:"596E79"},{code:"SW7605",name:"Gale Force",r:53,g:69,b:78,hex:"35454E"},{code:"SW7606",name:"Blue Cruise",r:101,g:145,b:168,hex:"6591A8"},{code:"SW7607",name:"Santorini Blue",r:65,g:109,b:131,hex:"416D83"},{code:"SW7608",name:"Adrift",r:135,g:170,b:185,hex:"87AAB9"},{code:"SW7609",name:"Georgian Revival Blue",r:91,g:141,b:159,hex:"5B8D9F"},{code:"SW7610",name:"Turkish Tile",r:62,g:117,b:138,hex:"3E758A"},{code:"SW7611",name:"Tranquil Aqua",r:124,g:154,b:160,hex:"7C9AA0"},{code:"SW7612",name:"Mountain Stream",r:103,g:145,b:153,hex:"679199"},{code:"SW7613",name:"Aqua-Sphere",r:156,g:176,b:179,hex:"9CB0B3"},{code:"SW7614",name:"St. Bart's",r:87,g:124,b:136,hex:"577C88"},{code:"SW7615",name:"Sea Serpent",r:62,g:75,b:84,hex:"3E4B54"},{code:"SW7616",name:"Breezy",r:160,g:174,b:175,hex:"A0AEAF"},{code:"SW7617",name:"Mediterranean",r:96,g:121,b:125,hex:"60797D"},{code:"SW7618",name:"Deep Sea Dive",r:55,g:97,b:103,hex:"376167"},{code:"SW7619",name:"Labradorite",r:101,g:123,b:131,hex:"657B83"},{code:"SW7620",name:"Seaworthy",r:49,g:77,b:88,hex:"314D58"},{code:"SW7621",name:"Silvermist",r:176,g:184,b:178,hex:"B0B8B2"},{code:"SW7622",name:"Homburg Gray",r:102,g:109,b:105,hex:"666D69"},{code:"SW7623",name:"Cascades",r:39,g:62,b:62,hex:"273E3E"},{code:"SW7624",name:"Slate Tile",r:96,g:110,b:116,hex:"606E74"},{code:"SW7625",name:"Mount Etna",r:61,g:72,b:76,hex:"3D484C"},{code:"SW7626",name:"Zurich White",r:230,g:225,b:217,hex:"E6E1D9"},{code:"SW7627",name:"White Heron",r:231,g:225,b:215,hex:"E7E1D7"},{code:"SW7628",name:"Windfresh White",r:222,g:216,b:207,hex:"DED8CF"},{code:"SW7629",name:"Grapy",r:120,g:110,b:112,hex:"786E70"},{code:"SW7630",name:"Raisin",r:57,g:43,b:45,hex:"392B2D"},{code:"SW7631",name:"City Loft",r:223,g:218,b:209,hex:"DFDAD1"},{code:"SW7632",name:"Modern Gray",r:214,g:206,b:195,hex:"D6CEC3"},{code:"SW7633",name:"Taupe Tone",r:173,g:160,b:144,hex:"ADA090"},{code:"SW7634",name:"Pediment",r:211,g:204,b:196,hex:"D3CCC4"},{code:"SW7635",name:"Palisade",r:170,g:158,b:149,hex:"AA9E95"},{code:"SW7636",name:"Origami White",r:229,g:226,b:218,hex:"E5E2DA"},{code:"SW7637",name:"Oyster White",r:226,g:221,b:208,hex:"E2DDD0"},{code:"SW7638",name:"Jogging Path",r:192,g:185,b:169,hex:"C0B9A9"},{code:"SW7639",name:"Ethereal Mood",r:174,g:165,b:148,hex:"AEA594"},{code:"SW7640",name:"Fawn Brindle",r:167,g:160,b:148,hex:"A7A094"},{code:"SW7641",name:"Colonnade Gray",r:198,g:192,b:182,hex:"C6C0B6"},{code:"SW7642",name:"Pavestone",r:160,g:153,b:143,hex:"A0998F"},{code:"SW7643",name:"Pussywillow",r:178,g:173,b:164,hex:"B2ADA4"},{code:"SW7644",name:"Gateway Gray",r:178,g:172,b:156,hex:"B2AC9C"},{code:"SW7645",name:"Thunder Gray",r:87,g:83,b:76,hex:"57534C"},{code:"SW7646",name:"First Star",r:218,g:217,b:212,hex:"DAD9D4"},{code:"SW7647",name:"Crushed Ice",r:214,g:211,b:204,hex:"D6D3CC"},{code:"SW7648",name:"Big Chill",r:208,g:206,b:201,hex:"D0CEC9"},{code:"SW7649",name:"Silverplate",r:194,g:192,b:186,hex:"C2C0BA"},{code:"SW7650",name:"Ellie Gray",r:170,g:169,b:164,hex:"AAA9A4"},{code:"SW7651",name:"Front Porch",r:204,g:204,b:197,hex:"CCCCC5"},{code:"SW7652",name:"Mineral Deposit",r:171,g:176,b:172,hex:"ABB0AC"},{code:"SW7653",name:"Silverpointe",r:209,g:210,b:203,hex:"D1D2CB"},{code:"SW7654",name:"Lattice",r:206,g:206,b:198,hex:"CECEC6"},{code:"SW7655",name:"Stamped Concrete",r:160,g:160,b:154,hex:"A0A09A"},{code:"SW7656",name:"Rhinestone",r:222,g:224,b:222,hex:"DEE0DE"},{code:"SW7657",name:"Tinsmith",r:197,g:200,b:196,hex:"C5C8C4"},{code:"SW7658",name:"Gray Clouds",r:183,g:183,b:178,hex:"B7B7B2"},{code:"SW7659",name:"Gris",r:165,g:169,b:168,hex:"A5A9A8"},{code:"SW7660",name:"Earl Grey",r:150,g:154,b:150,hex:"969A96"},{code:"SW7661",name:"Reflection",r:211,g:213,b:211,hex:"D3D5D3"},{code:"SW7662",name:"Evening Shadow",r:201,g:204,b:205,hex:"C9CCCD"},{code:"SW7663",name:"Monorail Silver",r:184,g:188,b:187,hex:"B8BCBB"},{code:"SW7664",name:"Steely Gray",r:144,g:151,b:155,hex:"90979B"},{code:"SW7665",name:"Wall Street",r:101,g:109,b:115,hex:"656D73"},{code:"SW7666",name:"Fleur de Sel",r:220,g:221,b:216,hex:"DCDDD8"},{code:"SW7667",name:"Zircon",r:202,g:201,b:198,hex:"CAC9C6"},{code:"SW7668",name:"March Wind",r:186,g:185,b:182,hex:"BAB9B6"},{code:"SW7669",name:"Summit Gray",r:149,g:148,b:145,hex:"959491"},{code:"SW7670",name:"Gray Shingle",r:148,g:147,b:146,hex:"949392"},{code:"SW7671",name:"On the Rocks",r:208,g:206,b:200,hex:"D0CEC8"},{code:"SW7672",name:"Knitting Needles",r:195,g:193,b:188,hex:"C3C1BC"},{code:"SW7673",name:"Pewter Cast",r:155,g:152,b:147,hex:"9B9893"},{code:"SW7674",name:"Peppercorn",r:88,g:88,b:88,hex:"585858"},{code:"SW7675",name:"Sealskin",r:72,g:66,b:60,hex:"48423C"},{code:"SW7676",name:"Paper Lantern",r:242,g:224,b:196,hex:"F2E0C4"},{code:"SW7677",name:"Gold Vessel",r:234,g:186,b:138,hex:"EABA8A"},{code:"SW7678",name:"Cottage Cream",r:237,g:219,b:189,hex:"EDDBBD"},{code:"SW7679",name:"Golden Gate",r:217,g:173,b:127,hex:"D9AD7F"},{code:"SW7680",name:"Lanyard",r:192,g:153,b:114,hex:"C09972"},{code:"SW7681",name:"Tea Light",r:248,g:228,b:194,hex:"F8E4C2"},{code:"SW7682",name:"Bee's Wax",r:234,g:191,b:134,hex:"EABF86"},{code:"SW7683",name:"Buff",r:241,g:223,b:193,hex:"F1DFC1"},{code:"SW7684",name:"Concord Buff",r:237,g:214,b:177,hex:"EDD6B1"},{code:"SW7685",name:"White Raisin",r:229,g:194,b:139,hex:"E5C28B"},{code:"SW7686",name:"Hinoki",r:248,g:221,b:183,hex:"F8DDB7"},{code:"SW7687",name:"August Moon",r:231,g:199,b:160,hex:"E7C7A0"},{code:"SW7688",name:"Sundew",r:225,g:205,b:174,hex:"E1CDAE"},{code:"SW7689",name:"Row House Tan",r:210,g:187,b:157,hex:"D2BB9D"},{code:"SW7690",name:"Townhall Tan",r:195,g:170,b:140,hex:"C3AA8C"},{code:"SW7691",name:"Pale Yellow",r:227,g:201,b:161,hex:"E3C9A1"},{code:"SW7692",name:"Cupola Yellow",r:220,g:188,b:142,hex:"DCBC8E"},{code:"SW7693",name:"Stonebriar",r:203,g:169,b:126,hex:"CBA97E"},{code:"SW7694",name:"Dromedary Camel",r:202,g:173,b:135,hex:"CAAD87"},{code:"SW7695",name:"Mesa Tan",r:189,g:156,b:119,hex:"BD9C77"},{code:"SW7696",name:"Toasted Pine Nut",r:220,g:198,b:166,hex:"DCC6A6"},{code:"SW7697",name:"Safari",r:204,g:177,b:139,hex:"CCB18B"},{code:"SW7698",name:"Straw Harvest",r:219,g:200,b:162,hex:"DBC8A2"},{code:"SW7699",name:"Rustic City",r:186,g:154,b:103,hex:"BA9A67"},{code:"SW7700",name:"Olde World Gold",r:143,g:108,b:62,hex:"8F6C3E"},{code:"SW7701",name:"Cavern Clay",r:172,g:107,b:83,hex:"AC6B53"},{code:"SW7702",name:"Spiced Cider",r:176,g:120,b:92,hex:"B0785C"},{code:"SW7703",name:"Earthen Jug",r:168,g:94,b:57,hex:"A85E39"},{code:"SW7704",name:"Tower Tan",r:213,g:181,b:155,hex:"D5B59B"},{code:"SW7705",name:"Wheat Penny",r:151,g:107,b:83,hex:"976B53"},{code:"SW7707",name:"Copper Wire",r:198,g:123,b:87,hex:"C67B57"},{code:"SW7709",name:"Copper Pot",r:177,g:106,b:55,hex:"B16A37"},{code:"SW7710",name:"Brandywine",r:165,g:108,b:74,hex:"A56C4A"},{code:"SW7711",name:"Pueblo",r:230,g:208,b:189,hex:"E6D0BD"},{code:"SW7712",name:"Townhouse Tan",r:223,g:200,b:181,hex:"DFC8B5"},{code:"SW7713",name:"Tawny Tan",r:204,g:178,b:153,hex:"CCB299"},{code:"SW7714",name:"Oak Barrel",r:191,g:162,b:135,hex:"BFA287"},{code:"SW7715",name:"Pottery Urn",r:170,g:134,b:110,hex:"AA866E"},{code:"SW7716",name:"Croissant",r:219,g:197,b:167,hex:"DBC5A7"},{code:"SW7717",name:"Ligonier Tan",r:210,g:177,b:143,hex:"D2B18F"},{code:"SW7718",name:"Oak Creek",r:187,g:141,b:107,hex:"BB8D6B"},{code:"SW7719",name:"Fresco Cream",r:216,g:196,b:174,hex:"D8C4AE"},{code:"SW7720",name:"Deer Valley",r:199,g:164,b:133,hex:"C7A485"},{code:"SW7721",name:"Crescent Cream",r:237,g:209,b:177,hex:"EDD1B1"},{code:"SW7722",name:"Travertine",r:236,g:211,b:179,hex:"ECD3B3"},{code:"SW7723",name:"Colony Buff",r:221,g:198,b:171,hex:"DDC6AB"},{code:"SW7724",name:"Canoe",r:183,g:152,b:123,hex:"B7987B"},{code:"SW7725",name:"Yearling",r:173,g:137,b:106,hex:"AD896A"},{code:"SW7726",name:"Lemon Verbena",r:157,g:152,b:111,hex:"9D986F"},{code:"SW7727",name:"Koi Pond",r:185,g:178,b:146,hex:"B9B292"},{code:"SW7728",name:"Green Sprout",r:162,g:159,b:128,hex:"A29F80"},{code:"SW7729",name:"Edamame",r:130,g:124,b:90,hex:"827C5A"},{code:"SW7730",name:"Forestwood",r:77,g:83,b:70,hex:"4D5346"},{code:"SW7731",name:"San Antonio Sage",r:166,g:148,b:116,hex:"A69474"},{code:"SW7732",name:"Lemongrass",r:200,g:189,b:152,hex:"C8BD98"},{code:"SW7733",name:"Bamboo Shoot",r:179,g:164,b:121,hex:"B3A479"},{code:"SW7734",name:"Olive Grove",r:133,g:124,b:93,hex:"857C5D"},{code:"SW7735",name:"Palm Leaf",r:99,g:89,b:54,hex:"635936"},{code:"SW7736",name:"Garden Sage",r:177,g:165,b:132,hex:"B1A584"},{code:"SW7737",name:"Meadow Trail",r:141,g:129,b:104,hex:"8D8168"},{code:"SW7738",name:"Cargo Pants",r:205,g:196,b:174,hex:"CDC4AE"},{code:"SW7739",name:"Herbal Wash",r:164,g:155,b:130,hex:"A49B82"},{code:"SW7740",name:"Messenger Bag",r:125,g:116,b:94,hex:"7D745E"},{code:"SW7741",name:"Willow Tree",r:170,g:173,b:156,hex:"AAAD9C"},{code:"SW7742",name:"Agate Green",r:142,g:164,b:134,hex:"8EA486"},{code:"SW7743",name:"Mountain Road",r:134,g:133,b:120,hex:"868578"},{code:"SW7744",name:"Zeus",r:153,g:144,b:126,hex:"99907E"},{code:"SW7745",name:"Muddled Basil",r:90,g:82,b:67,hex:"5A5243"},{code:"SW7746",name:"Rushing River",r:161,g:156,b:143,hex:"A19C8F"},{code:"SW7747",name:"Recycled Glass",r:189,g:192,b:160,hex:"BDC0A0"},{code:"SW7748",name:"Green Earth",r:154,g:152,b:131,hex:"9A9883"},{code:"SW7749",name:"Laurel Woods",r:68,g:73,b:61,hex:"44493D"},{code:"SW7750",name:"Olympic Range",r:66,g:76,b:68,hex:"424C44"},{code:"SW7757",name:"High Reflective White",r:247,g:247,b:241,hex:"F7F7F1"},{code:"SW8917",name:"Shell White",r:240,g:235,b:224,hex:"F0EBE0"},{code:"SW9001",name:"Audrey's Blush",r:174,g:128,b:135,hex:"AE8087"},{code:"SW9002",name:"Carley's Rose",r:168,g:115,b:118,hex:"A87376"},{code:"SW9003",name:"Rita's Rouge",r:186,g:113,b:118,hex:"BA7176"},{code:"SW9004",name:"Coral Rose",r:195,g:127,b:122,hex:"C37F7A"},{code:"SW9005",name:"Coral Clay",r:191,g:121,b:110,hex:"BF796E"},{code:"SW9006",name:"Rojo Dust",r:181,g:116,b:102,hex:"B57466"},{code:"SW9007",name:"Mel�n Meloso",r:242,g:184,b:140,hex:"F2B88C"},{code:"SW9008",name:"Bellini Fizz",r:245,g:199,b:142,hex:"F5C78E"},{code:"SW9009",name:"Subdued Sienna",r:204,g:137,b:108,hex:"CC896C"},{code:"SW9010",name:"Windswept Canyon",r:219,g:164,b:128,hex:"DBA480"},{code:"SW9011",name:"Sun Bleached Ochre",r:227,g:171,b:123,hex:"E3AB7B"},{code:"SW9012",name:"Polvo de Oro",r:232,g:184,b:127,hex:"E8B87F"},{code:"SW9013",name:"Olden Amber",r:238,g:183,b:107,hex:"EEB76B"},{code:"SW9014",name:"Pollen Powder",r:251,g:209,b:135,hex:"FBD187"},{code:"SW9015",name:"They call it Mellow",r:251,g:228,b:179,hex:"FBE4B3"},{code:"SW9016",name:"La Luna Amarilla",r:253,g:223,b:160,hex:"FDDFA0"},{code:"SW9017",name:"Sunny Veranda",r:254,g:223,b:148,hex:"FEDF94"},{code:"SW9018",name:"Honey Bees",r:251,g:214,b:130,hex:"FBD682"},{code:"SW9019",name:"Golden Plumeria",r:251,g:208,b:115,hex:"FBD073"},{code:"SW9020",name:"Rayo de Sol",r:244,g:196,b:84,hex:"F4C454"},{code:"SW9021",name:"Naples Yellow",r:246,g:213,b:143,hex:"F6D58F"},{code:"SW9022",name:"Yellow Bird",r:241,g:205,b:123,hex:"F1CD7B"},{code:"SW9023",name:"Dakota Wheat",r:225,g:189,b:142,hex:"E1BD8E"},{code:"SW9024",name:"Vintage Gold",r:203,g:165,b:118,hex:"CBA576"},{code:"SW9025",name:"Coriander Powder",r:186,g:156,b:117,hex:"BA9C75"},{code:"SW9026",name:"Tarnished Trumpet",r:213,g:177,b:118,hex:"D5B176"},{code:"SW9027",name:"Pale Moss",r:220,g:199,b:151,hex:"DCC797"},{code:"SW9028",name:"Dusted Olive",r:190,g:167,b:117,hex:"BEA775"},{code:"SW9029",name:"Cool Avocado",r:196,g:180,b:125,hex:"C4B47D"},{code:"SW9030",name:"Lim�n Fresco",r:206,g:188,b:85,hex:"CEBC55"},{code:"SW9031",name:"Primavera",r:210,g:208,b:131,hex:"D2D083"},{code:"SW9032",name:"Stay in Lime",r:159,g:172,b:92,hex:"9FAC5C"},{code:"SW9033",name:"Oh Pistachio",r:171,g:202,b:153,hex:"ABCA99"},{code:"SW9034",name:"Seawashed Glass",r:169,g:192,b:149,hex:"A9C095"},{code:"SW9035",name:"Frosted Emerald",r:120,g:177,b:133,hex:"78B185"},{code:"SW9036",name:"Retro Mint",r:159,g:205,b:177,hex:"9FCDB1"},{code:"SW9037",name:"Baby Bok Choy",r:187,g:185,b:138,hex:"BBB98A"},{code:"SW9038",name:"Cucuzza Verde",r:155,g:163,b:115,hex:"9BA373"},{code:"SW9039",name:"Broccoflower",r:143,g:162,b:119,hex:"8FA277"},{code:"SW9040",name:"Reseda Green",r:117,g:148,b:107,hex:"75946B"},{code:"SW9041",name:"Parisian Patina",r:125,g:155,b:137,hex:"7D9B89"},{code:"SW9042",name:"Verdigreen",r:129,g:165,b:149,hex:"81A595"},{code:"SW9043",name:"Aquastone",r:137,g:198,b:183,hex:"89C6B7"},{code:"SW9044",name:"Little Blue Box",r:138,g:197,b:186,hex:"8AC5BA"},{code:"SW9045",name:"Bora Bora Shore",r:146,g:208,b:208,hex:"92D0D0"},{code:"SW9046",name:"Gentle Aquamarine",r:151,g:203,b:210,hex:"97CBD2"},{code:"SW9047",name:"After the Rain",r:139,g:196,b:209,hex:"8BC4D1"},{code:"SW9048",name:"Surfin'",r:115,g:192,b:210,hex:"73C0D2"},{code:"SW9049",name:"Sky Fall",r:137,g:198,b:223,hex:"89C6DF"},{code:"SW9050",name:"Vintage Vessel",r:148,g:178,b:166,hex:"94B2A6"},{code:"SW9051",name:"Aquaverde",r:163,g:192,b:189,hex:"A3C0BD"},{code:"SW9052",name:"Blithe Blue",r:144,g:189,b:189,hex:"90BDBD"},{code:"SW9053",name:"Agua Fr�a",r:159,g:197,b:204,hex:"9FC5CC"},{code:"SW9054",name:"Little Boy Blu",r:199,g:216,b:219,hex:"C7D8DB"},{code:"SW9055",name:"Billowy Breeze",r:175,g:199,b:205,hex:"AFC7CD"},{code:"SW9056",name:"French Moire",r:159,g:187,b:195,hex:"9FBBC3"},{code:"SW9057",name:"Aquitaine",r:136,g:171,b:180,hex:"88ABB4"},{code:"SW9058",name:"Secret Cove",r:104,g:144,b:157,hex:"68909D"},{code:"SW9059",name:"Silken Peacock",r:66,g:117,b:132,hex:"427584"},{code:"SW9060",name:"Connor's Lakefront",r:23,g:90,b:108,hex:"175A6C"},{code:"SW9061",name:"Rest Assured",r:155,g:191,b:201,hex:"9BBFC9"},{code:"SW9062",name:"Bluebird Feather",r:111,g:157,b:179,hex:"6F9DB3"},{code:"SW9063",name:"Porch Ceiling",r:155,g:200,b:222,hex:"9BC8DE"},{code:"SW9064",name:"Bluesy Note",r:124,g:154,b:181,hex:"7C9AB5"},{code:"SW9065",name:"Perfect Periwinkle",r:100,g:135,b:176,hex:"6487B0"},{code:"SW9066",name:"Agapanthus",r:187,g:197,b:222,hex:"BBC5DE"},{code:"SW9067",name:"Forever Lilac",r:175,g:165,b:199,hex:"AFA5C7"},{code:"SW9068",name:"Berry Frapp�",r:179,g:161,b:198,hex:"B3A1C6"},{code:"SW9069",name:"Veri Berri",r:147,g:116,b:150,hex:"937496"},{code:"SW9070",name:"Baby Blue Eyes",r:131,g:162,b:180,hex:"83A2B4"},{code:"SW9071",name:"Dyer's Woad",r:123,g:153,b:176,hex:"7B99B0"},{code:"SW9072",name:"Dried Lavender",r:133,g:149,b:170,hex:"8595AA"},{code:"SW9073",name:"Dusty Heather",r:137,g:144,b:163,hex:"8990A3"},{code:"SW9074",name:"Gentle Grape",r:144,g:138,b:155,hex:"908A9B"},{code:"SW9075",name:"Berry Cream",r:154,g:140,b:162,hex:"9A8CA2"},{code:"SW9076",name:"Ruby Violet",r:155,g:126,b:139,hex:"9B7E8B"},{code:"SW9077",name:"Rosaline Pearl",r:163,g:136,b:135,hex:"A38887"},{code:"SW9078",name:"Cocoa Berry",r:160,g:136,b:130,hex:"A08882"},{code:"SW9079",name:"Velvety Chestnut",r:162,g:135,b:125,hex:"A2877D"},{code:"SW9080",name:"Hushed Auburn",r:168,g:133,b:122,hex:"A8857A"},{code:"SW9081",name:"Redend Point",r:174,g:142,b:126,hex:"AE8E7E"},{code:"SW9082",name:"Chocolate Powder",r:165,g:140,b:123,hex:"A58C7B"},{code:"SW9083",name:"Dusted Truffle",r:156,g:131,b:115,hex:"9C8373"},{code:"SW9084",name:"Cocoa Whip",r:160,g:142,b:126,hex:"A08E7E"},{code:"SW9085",name:"Touch of Sand",r:213,g:199,b:186,hex:"D5C7BA"},{code:"SW9086",name:"Cool Beige",r:198,g:181,b:167,hex:"C6B5A7"},{code:"SW9087",name:"Smoky Beige",r:185,g:167,b:150,hex:"B9A796"},{code:"SW9088",name:"Utaupeia",r:165,g:143,b:123,hex:"A58F7B"},{code:"SW9089",name:"Llama Wool",r:145,g:120,b:100,hex:"917864"},{code:"SW9090",name:"Cara�be",r:120,g:95,b:76,hex:"785F4C"},{code:"SW9091",name:"Half-Caff",r:96,g:76,b:61,hex:"604C3D"},{code:"SW9092",name:"Iced Mocha",r:163,g:132,b:108,hex:"A3846C"},{code:"SW9093",name:"Nearly Brown",r:168,g:142,b:118,hex:"A88E76"},{code:"SW9094",name:"Playa Arenosa",r:220,g:199,b:179,hex:"DCC7B3"},{code:"SW9095",name:"Ginger Root",r:210,g:183,b:158,hex:"D2B79E"},{code:"SW9096",name:"Beige Intenso",r:197,g:168,b:141,hex:"C5A88D"},{code:"SW9097",name:"Soft Fawn",r:181,g:151,b:120,hex:"B59778"},{code:"SW9098",name:"Baked Cookie",r:137,g:103,b:74,hex:"89674A"},{code:"SW9099",name:"Saddle Up",r:114,g:82,b:55,hex:"725237"},{code:"SW9100",name:"Umber Rust",r:118,g:81,b:56,hex:"765138"},{code:"SW9101",name:"Tres Naturale",r:220,g:199,b:173,hex:"DCC7AD"},{code:"SW9102",name:"Quinoa",r:207,g:181,b:151,hex:"CFB597"},{code:"SW9103",name:"Farro",r:193,g:164,b:133,hex:"C1A485"},{code:"SW9104",name:"Woven Wicker",r:185,g:153,b:116,hex:"B99974"},{code:"SW9105",name:"Almond Roca",r:167,g:131,b:97,hex:"A78361"},{code:"SW9106",name:"El Caramelo",r:148,g:110,b:72,hex:"946E48"},{code:"SW9107",name:"�ber Umber",r:123,g:88,b:56,hex:"7B5838"},{code:"SW9108",name:"Double Latte",r:167,g:140,b:113,hex:"A78C71"},{code:"SW9109",name:"Natural Linen",r:223,g:211,b:195,hex:"DFD3C3"},{code:"SW9110",name:"Malabar",r:207,g:190,b:169,hex:"CFBEA9"},{code:"SW9111",name:"Antler Velvet",r:192,g:173,b:150,hex:"C0AD96"},{code:"SW9112",name:"Song Thrush",r:175,g:152,b:127,hex:"AF987F"},{code:"SW9113",name:"Mudslide",r:160,g:133,b:104,hex:"A08568"},{code:"SW9114",name:"Fallen Leaves",r:143,g:118,b:89,hex:"8F7659"},{code:"SW9115",name:"Cowboy Boots",r:105,g:82,b:57,hex:"695239"},{code:"SW9116",name:"Serengeti Grass",r:171,g:149,b:121,hex:"AB9579"},{code:"SW9117",name:"Urban Jungle",r:164,g:148,b:126,hex:"A4947E"},{code:"SW9118",name:"Tarnished Treasure",r:185,g:164,b:126,hex:"B9A47E"},{code:"SW9119",name:"Dirty Martini",r:221,g:208,b:182,hex:"DDD0B6"},{code:"SW9120",name:"Tumblin' Tumbleweed",r:205,g:187,b:156,hex:"CDBB9C"},{code:"SW9121",name:"Sawgrass Basket",r:195,g:176,b:144,hex:"C3B090"},{code:"SW9122",name:"Dried Edamame",r:177,g:159,b:128,hex:"B19F80"},{code:"SW9123",name:"Barro Verde",r:159,g:142,b:113,hex:"9F8E71"},{code:"SW9124",name:"Verde Marr�n",r:135,g:116,b:89,hex:"877459"},{code:"SW9125",name:"Oliva Oscuro",r:102,g:84,b:57,hex:"665439"},{code:"SW9126",name:"Honed Soapstone",r:157,g:152,b:135,hex:"9D9887"},{code:"SW9127",name:"At Ease Soldier",r:158,g:153,b:133,hex:"9E9985"},{code:"SW9128",name:"Green Onyx",r:152,g:154,b:130,hex:"989A82"},{code:"SW9129",name:"Jade Dragon",r:144,g:152,b:134,hex:"909886"},{code:"SW9130",name:"Evergreen Fog",r:149,g:151,b:138,hex:"95978A"},{code:"SW9131",name:"Cornwall Slate",r:148,g:148,b:136,hex:"949488"},{code:"SW9132",name:"Acacia Haze",r:150,g:156,b:146,hex:"969C92"},{code:"SW9133",name:"Jasper Stone",r:141,g:158,b:151,hex:"8D9E97"},{code:"SW9134",name:"Delft",r:139,g:159,b:160,hex:"8B9FA0"},{code:"SW9135",name:"Whirlpool",r:128,g:150,b:157,hex:"80969D"},{code:"SW9136",name:"Lullaby",r:203,g:212,b:212,hex:"CBD4D4"},{code:"SW9137",name:"Niebla Azul",r:182,g:195,b:196,hex:"B6C3C4"},{code:"SW9138",name:"Stardew",r:166,g:178,b:181,hex:"A6B2B5"},{code:"SW9139",name:"Debonair",r:144,g:160,b:166,hex:"90A0A6"},{code:"SW9140",name:"Blustery Sky",r:111,g:132,b:140,hex:"6F848C"},{code:"SW9141",name:"Waterloo",r:83,g:104,b:114,hex:"536872"},{code:"SW9142",name:"Moscow Midnight",r:32,g:70,b:82,hex:"204652"},{code:"SW9143",name:"Cadet",r:145,g:153,b:156,hex:"91999C"},{code:"SW9144",name:"Moonmist",r:201,g:217,b:224,hex:"C9D9E0"},{code:"SW9145",name:"Sleepy Hollow",r:183,g:201,b:209,hex:"B7C9D1"},{code:"SW9146",name:"Faded Flaxflower",r:158,g:180,b:192,hex:"9EB4C0"},{code:"SW9147",name:"Favorite Jeans",r:138,g:163,b:177,hex:"8AA3B1"},{code:"SW9148",name:"Smoky Azurite",r:112,g:141,b:158,hex:"708D9E"},{code:"SW9149",name:"Inky Blue",r:78,g:114,b:135,hex:"4E7287"},{code:"SW9150",name:"Endless Sea",r:50,g:88,b:110,hex:"32586E"},{code:"SW9151",name:"Daphne",r:137,g:156,b:170,hex:"899CAA"},{code:"SW9152",name:"Let it Rain",r:151,g:159,b:165,hex:"979FA5"},{code:"SW9153",name:"Moonlit Orchid",r:148,g:145,b:148,hex:"949194"},{code:"SW9154",name:"Perle Noir",r:79,g:77,b:81,hex:"4F4D51"},{code:"SW9155",name:"Slate Violet",r:152,g:145,b:146,hex:"989192"},{code:"SW9156",name:"Gris Morado",r:143,g:138,b:145,hex:"8F8A91"},{code:"SW9157",name:"Autumn Orchid",r:157,g:144,b:147,hex:"9D9093"},{code:"SW9158",name:"Coquina",r:157,g:141,b:142,hex:"9D8D8E"},{code:"SW9159",name:"Auger Shell",r:159,g:146,b:145,hex:"9F9291"},{code:"SW9160",name:"Armadillo",r:158,g:144,b:137,hex:"9E9089"},{code:"SW9161",name:"Dustblu",r:149,g:155,b:160,hex:"959BA0"},{code:"SW9162",name:"African Gray",r:147,g:152,b:153,hex:"939899"},{code:"SW9163",name:"Tin Lizzie",r:147,g:149,b:145,hex:"939591"},{code:"SW9164",name:"Illusive Green",r:146,g:148,b:141,hex:"92948D"},{code:"SW9165",name:"Gossamer Veil",r:211,g:206,b:196,hex:"D3CEC4"},{code:"SW9166",name:"Drift of Mist",r:220,g:216,b:208,hex:"DCD8D0"},{code:"SW9167",name:"Polished Concrete",r:158,g:151,b:147,hex:"9E9793"},{code:"SW9168",name:"Elephant Ear",r:152,g:143,b:133,hex:"988F85"},{code:"SW9169",name:"Chatura Gray",r:160,g:146,b:135,hex:"A09287"},{code:"SW9170",name:"Acier",r:158,g:153,b:145,hex:"9E9991"},{code:"SW9171",name:"Felted Wool",r:151,g:144,b:131,hex:"979083"},{code:"SW9172",name:"Studio Clay",r:149,g:141,b:127,hex:"958D7F"},{code:"SW9173",name:"Shiitake",r:200,g:188,b:171,hex:"C8BCAB"},{code:"SW9174",name:"Moth Wing",r:160,g:144,b:127,hex:"A0907F"},{code:"SW9175",name:"Deep Forest Brown",r:57,g:52,b:55,hex:"393437"},{code:"SW9176",name:"Dress Blues",r:43,g:67,b:96,hex:"2B4360"},{code:"SW9177",name:"Salty Dog",r:35,g:64,b:88,hex:"234058"},{code:"SW9178",name:"In the Navy",r:40,g:56,b:73,hex:"283849"},{code:"SW9179",name:"Anchors Aweigh",r:43,g:52,b:65,hex:"2B3441"},{code:"SW9180",name:"Aged White",r:232,g:222,b:205,hex:"E8DECD"},{code:"SW9182",name:"Rojo Marr�n",r:75,g:48,b:41,hex:"4B3029"},{code:"SW9183",name:"Dark Clove",r:76,g:61,b:49,hex:"4C3D31"},{code:"SW9184",name:"Foxhall Green",r:69,g:75,b:64,hex:"454B40"},{code:"SW9185",name:"Marea Baja",r:46,g:84,b:100,hex:"2E5464"},{code:"SW9186",name:"Caramelized",r:194,g:152,b:113,hex:"C29871"},{code:"",name:"",r:null,g:null,b:null,hex:""}];

    var colors = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': swColors
    });

    /* src\Tile.svelte generated by Svelte v3.46.4 */
    const file$4 = "src\\Tile.svelte";

    // (12:0) {#if colorInfo}
    function create_if_block$1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let div2;
    	let div0;
    	let t3;
    	let div1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = `${/*colorInfo*/ ctx[1].code}`;
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = `${/*colorInfo*/ ctx[1].name}`;
    			add_location(p, file$4, 12, 1, 276);
    			attr_dev(div0, "class", "tile-code svelte-2kfbxn");
    			add_location(div0, file$4, 14, 2, 367);
    			attr_dev(div1, "class", "tile-name svelte-2kfbxn");
    			add_location(div1, file$4, 15, 2, 415);
    			attr_dev(div2, "class", "tile svelte-2kfbxn");
    			set_style(div2, "background", "#" + /*colorInfo*/ ctx[1].hex);
    			set_style(div2, "color", /*textColor*/ ctx[2]);
    			add_location(div2, file$4, 13, 1, 292);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(12:0) {#if colorInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let if_block = /*colorInfo*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*colorInfo*/ ctx[1]) if_block.p(ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tile', slots, []);
    	let { code } = $$props;
    	let { title = "" } = $$props;
    	let colorInfo = swColors.find(c => c.code === `SW${code}`);

    	let textColor = parseInt(colorInfo.hex, 16) > 0xffffff / 2
    	? "#000"
    	: "#fff";

    	const writable_props = ['code', 'title'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('code' in $$props) $$invalidate(3, code = $$props.code);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({
    		code,
    		title,
    		colors,
    		colorInfo,
    		textColor
    	});

    	$$self.$inject_state = $$props => {
    		if ('code' in $$props) $$invalidate(3, code = $$props.code);
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('colorInfo' in $$props) $$invalidate(1, colorInfo = $$props.colorInfo);
    		if ('textColor' in $$props) $$invalidate(2, textColor = $$props.textColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, colorInfo, textColor, code];
    }

    class Tile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { code: 3, title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tile",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*code*/ ctx[3] === undefined && !('code' in props)) {
    			console.warn("<Tile> was created without expected prop 'code'");
    		}
    	}

    	get code() {
    		throw new Error("<Tile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set code(value) {
    		throw new Error("<Tile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Tile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Tile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var swSchemes = [{name:1,body:7536,trim:6144},{name:2,body:7549,trim:6106},{name:3,body:7536,trim:6081},{name:4,body:7694,trim:6081},{name:5,body:7725,trim:6081},{name:6,body:7715,trim:7502},{name:7,body:6106,trim:7502},{name:8,body:7715,trim:6122},{name:9,body:6129,trim:6081},{name:10,body:6117,trim:6159},{name:11,body:7695,trim:7725},{name:12,body:7569,trim:7039},{name:13,body:7532,trim:6124},{name:14,body:6113,trim:6117},{name:15,body:7693,trim:7699},{name:16,body:7536,trim:7008},{name:17,body:6144,trim:7689},{name:18,body:6109,trim:7719},{name:19,body:6109,trim:7695},{name:20,body:7680,trim:6107},{name:21,body:7547,trim:7550},{name:22,body:7689,trim:6124},{name:23,body:7032,trim:7036},{name:24,body:6140,trim:6076},{name:25,body:6088,trim:7694},{name:26,body:7011,trim:7520}];

    var data$2 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': swSchemes
    });

    /* src\HouseColors.svelte generated by Svelte v3.46.4 */
    const file$3 = "src\\HouseColors.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (23:1) {#if filters.length === 0 || filters.includes(item.name.toString())}
    function create_if_block(ctx) {
    	let h2;
    	let t0;
    	let t1_value = /*item*/ ctx[5].name + "";
    	let t1;
    	let t2;
    	let tile0;
    	let t3;
    	let tile1;
    	let t4;
    	let br0;
    	let t5;
    	let br1;
    	let t6;
    	let br2;
    	let t7;
    	let br3;
    	let current;

    	tile0 = new Tile({
    			props: {
    				code: /*item*/ ctx[5].body,
    				title: "Body/Garage Door"
    			},
    			$$inline: true
    		});

    	tile1 = new Tile({
    			props: {
    				code: /*item*/ ctx[5].trim,
    				title: "Trim/Pop Outs"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t0 = text("Scheme ");
    			t1 = text(t1_value);
    			t2 = space();
    			create_component(tile0.$$.fragment);
    			t3 = space();
    			create_component(tile1.$$.fragment);
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			br2 = element("br");
    			t7 = space();
    			br3 = element("br");
    			add_location(h2, file$3, 23, 2, 507);
    			add_location(br0, file$3, 26, 2, 640);
    			add_location(br1, file$3, 27, 2, 649);
    			add_location(br2, file$3, 28, 2, 658);
    			add_location(br3, file$3, 29, 2, 667);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			insert_dev(target, t2, anchor);
    			mount_component(tile0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tile1, target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, br3, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tile0.$$.fragment, local);
    			transition_in(tile1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tile0.$$.fragment, local);
    			transition_out(tile1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t2);
    			destroy_component(tile0, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tile1, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(br3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(23:1) {#if filters.length === 0 || filters.includes(item.name.toString())}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#each items as item}
    function create_each_block$2(ctx) {
    	let show_if = /*filters*/ ctx[1].length === 0 || /*filters*/ ctx[1].includes(/*item*/ ctx[5].name.toString());
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filters*/ 2) show_if = /*filters*/ ctx[1].length === 0 || /*filters*/ ctx[1].includes(/*item*/ ctx[5].name.toString());

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*filters*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(22:0) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let h1;
    	let t1;
    	let span;
    	let t3;
    	let input;
    	let t4;
    	let each_1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*items*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "House";
    			t1 = space();
    			span = element("span");
    			span.textContent = "Filter Schemes:";
    			t3 = space();
    			input = element("input");
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file$3, 17, 0, 289);
    			add_location(span, file$3, 18, 0, 304);
    			attr_dev(input, "placeholder", "ex: 7 21 23");
    			add_location(input, file$3, 19, 0, 333);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*filterText*/ ctx[0]);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(input, "input", /*onInput*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*filterText*/ 1 && input.value !== /*filterText*/ ctx[0]) {
    				set_input_value(input, /*filterText*/ ctx[0]);
    			}

    			if (dirty & /*items, filters*/ 6) {
    				each_value = /*items*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('HouseColors', slots, []);
    	let items = swSchemes;
    	let filterText = "";
    	let filters = [];

    	function onInput() {
    		if (filterText === "") {
    			$$invalidate(1, filters = []);
    		} else {
    			$$invalidate(1, filters = filterText.split(" "));
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HouseColors> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		filterText = this.value;
    		$$invalidate(0, filterText);
    	}

    	$$self.$capture_state = () => ({
    		Tile,
    		data: data$2,
    		items,
    		filterText,
    		filters,
    		onInput
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(2, items = $$props.items);
    		if ('filterText' in $$props) $$invalidate(0, filterText = $$props.filterText);
    		if ('filters' in $$props) $$invalidate(1, filters = $$props.filters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [filterText, filters, items, onInput, input_input_handler];
    }

    class HouseColors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HouseColors",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    var swDoors = [7509,6054,6047,6090,7514,7062,6055,6328,6040,6068,6104,7034,7008,6223,6188,6258];

    var data$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': swDoors
    });

    /* src\DoorColors.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\DoorColors.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (7:0) {#each data.default as item}
    function create_each_block$1(ctx) {
    	let tile;
    	let current;

    	tile = new Tile({
    			props: { code: /*item*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tile.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tile, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tile.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tile.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tile, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(7:0) {#each data.default as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = swDoors;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Doors";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file$2, 5, 0, 97);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 0) {
    				each_value = swDoors;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DoorColors', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DoorColors> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Tile, data: data$1 });
    	return [];
    }

    class DoorColors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DoorColors",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var swMetal = [6040,6258];

    var data = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': swMetal
    });

    /* src\MetalColors.svelte generated by Svelte v3.46.4 */
    const file$1 = "src\\MetalColors.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (7:0) {#each data.default as item}
    function create_each_block(ctx) {
    	let tile;
    	let current;

    	tile = new Tile({
    			props: { code: /*item*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tile.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tile, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tile.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tile.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tile, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(7:0) {#each data.default as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let h1;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = swMetal;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Metal Rail/Decorative Metal";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file$1, 5, 0, 97);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 0) {
    				each_value = swMetal;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MetalColors', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MetalColors> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Tile, data });
    	return [];
    }

    class MetalColors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MetalColors",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let housecolors;
    	let t0;
    	let br0;
    	let t1;
    	let br1;
    	let t2;
    	let br2;
    	let t3;
    	let doorcolors;
    	let t4;
    	let br3;
    	let t5;
    	let br4;
    	let t6;
    	let br5;
    	let t7;
    	let metalcolors;
    	let current;
    	housecolors = new HouseColors({ $$inline: true });
    	doorcolors = new DoorColors({ $$inline: true });
    	metalcolors = new MetalColors({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(housecolors.$$.fragment);
    			t0 = space();
    			br0 = element("br");
    			t1 = space();
    			br1 = element("br");
    			t2 = space();
    			br2 = element("br");
    			t3 = space();
    			create_component(doorcolors.$$.fragment);
    			t4 = space();
    			br3 = element("br");
    			t5 = space();
    			br4 = element("br");
    			t6 = space();
    			br5 = element("br");
    			t7 = space();
    			create_component(metalcolors.$$.fragment);
    			add_location(br0, file, 7, 0, 181);
    			add_location(br1, file, 8, 0, 188);
    			add_location(br2, file, 9, 0, 195);
    			add_location(br3, file, 11, 0, 217);
    			add_location(br4, file, 12, 0, 224);
    			add_location(br5, file, 13, 0, 231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(housecolors, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(doorcolors, target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br3, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, br4, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, br5, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(metalcolors, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(housecolors.$$.fragment, local);
    			transition_in(doorcolors.$$.fragment, local);
    			transition_in(metalcolors.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(housecolors.$$.fragment, local);
    			transition_out(doorcolors.$$.fragment, local);
    			transition_out(metalcolors.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(housecolors, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t3);
    			destroy_component(doorcolors, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br3);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(br4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br5);
    			if (detaching) detach_dev(t7);
    			destroy_component(metalcolors, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ HouseColors, DoorColors, MetalColors });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
