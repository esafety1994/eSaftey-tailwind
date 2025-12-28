 (function () {
                function applyColorMap(map) {
                    document.querySelectorAll('.color-swatch-circle[data-color-name]').forEach(function (el) {
                        var name = el.getAttribute('data-color-name') || '';
                        var hex = map[name.toLowerCase()];
                        if (hex) {
                            var val = String(hex).trim();
                            // detect image URL or data URI
                            var isImage = /^data:image\//i.test(val) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(val) || /^(https?:)?\/\//.test(val) && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(val);
                            if (isImage) {
                                el.style.backgroundImage = 'url("' + val + '")';
                                el.style.backgroundSize = 'cover';
                                el.style.backgroundPosition = 'center';
                                el.style.backgroundRepeat = 'no-repeat';
                                el.style.border = '1px solid #eee';
                                el.textContent = '';
                            } else {
                                el.style.backgroundImage = '';
                                el.style.backgroundColor = val;
                                if (val.toLowerCase() === '#ffffff' || val.toLowerCase() === 'white') {
                                    el.style.border = '1px solid #ddd';
                                }
                            }
                        } else {
                            // try if the name itself is a hex
                            if (/^#([0-9A-F]{3}){1,2}$/i.test(name.trim())) {
                                el.style.backgroundColor = name.trim();
                            } else {
                                // fallback: show text inside (accessible)
                                el.style.backgroundColor = 'transparent';
                                el.style.display = 'inline-flex';
                                el.style.alignItems = 'center';
                                el.style.justifyContent = 'center';
                                el.textContent = name.charAt(0);
                                el.style.fontSize = '10px';
                            }
                        }
                    });
                }

                function loadColorMapAndApply() {
                    // try to pick up a provided URL from the script tag that included this file
                    var scriptTag = document.querySelector('script[data-color-map]');
                    var url = scriptTag ? scriptTag.getAttribute('data-color-map') : '/assets/color-map.json';
                    fetch(url).then(function (r) {
                        if (!r.ok) return {};
                        return r.json();
                    }).then(function (json) {
                        var normalized = {};
                        try {
                            Object.keys(json || {}).forEach(function (k) { normalized[k.toLowerCase()] = json[k]; });
                        } catch (e) { normalized = json || {}; }
                        applyColorMap(normalized || {});
                    }).catch(function () {
                        // ignore
                    });
                }

                document.addEventListener('DOMContentLoaded', loadColorMapAndApply);
                document.addEventListener('product:content:replaced', loadColorMapAndApply);
            })();