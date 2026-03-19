/**
 * map-engine.js
 * Three.js globe setup, rendering, animation, raycaster interaction,
 * data loading, tab switching, and country list rendering.
 *
 * Depends on: map-data.js, map-i18n.js (window.txidMap)
 */
(function () {
  'use strict';

  var M = window.txidMap;
  var t = M.t;
  var escHtml = M.escHtml;
  var fetchRetry = M.fetchRetry;
  var getName = M.getName;
  var FLAGS = M.FLAGS;
  var CENTROIDS = M.CENTROIDS;
  var NAME_TO_ISO2 = M.NAME_TO_ISO2;
  var API = M.API;

  // ── Shared state ──
  var currentTab = 'ln';
  var globeState = null;
  var worldGeoRaw = null;

  M.currentTab = currentTab;

  // ── Tab switching ──
  function switchTab(tab) {
    currentTab = tab;
    M.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('tab-' + tab)?.classList.add('active');
    // Show/hide Lightning-only sections
    document.querySelectorAll('.ln-only').forEach(function (el) {
      el.style.display = tab === 'ln' ? '' : 'none';
    });
    document.getElementById('node-detail')?.classList.add('hidden');
    loadData();
  }

  // ── Load data from API ──
  async function loadData() {
    var gs = document.getElementById('global-stats');
    var cl = document.getElementById('country-list');
    gs.innerHTML = '<div class="loading-msg">' + t('loading') + '</div>';
    cl.innerHTML = '';

    try {
      if (currentTab === 'ln') {
        var results = await Promise.all([
          fetchRetry(API + '/v1/lightning/nodes/countries', 10000).then(function (r) { return r.json(); }),
          fetchRetry(API + '/v1/lightning/statistics/latest', 10000).then(function (r) { return r.json(); }),
        ]);
        var countries = results[0];
        var stats = results[1];
        var total = countries.reduce(function (s, n) { return s + (n.count || 0); }, 0);
        var s = stats.latest || stats;
        gs.innerHTML = ''; // Lightning stats shown in Network History widget

        var sorted = countries.map(function (n) { return [n.iso, { count: n.count, share: n.share }]; }).sort(function (a, b) { return b[1].count - a[1].count; });
        window._mapData = { type: 'ln', data: sorted, total: total };
        renderMap(window._mapData);
        renderCountryList(sorted, total, 'nodes');
        // Load node explorer data for Lightning tab
        if (typeof M.loadTopNodes === 'function') M.loadTopNodes();
        if (typeof M.loadNetworkHistory === 'function') M.loadNetworkHistory();
      } else {
        var pools = await fetchRetry(API + '/v1/mining/pools/1w', 10000).then(function (r) { return r.json(); });
        gs.innerHTML =
          '<div class="gs-card"><div class="gs-val">' + (pools.pools?.length || 0) + '</div><div class="gs-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><path d="M15 4l5 5-11 11H4v-5L15 4z"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + t('active_pools') + '</div></div>' +
          '<div class="gs-card"><div class="gs-val">' + (pools.blockCount || 0) + '</div><div class="gs-lbl">' + t('blocks_7d') + '</div></div>';

        var poolCountry = {
          'Foundry USA': 'US', 'AntPool': 'CN', 'F2Pool': 'CN', 'ViaBTC': 'CN', 'Binance Pool': 'CN',
          'MARA Pool': 'US', 'Luxor': 'US', 'Braiins Pool': 'CZ', 'SBI Crypto': 'JP',
          'Poolin': 'CN', 'BTC.com': 'CN', '1THash': 'CN', 'SpiderPool': 'CN',
          'Ocean': 'GB', 'EMCDPool': 'RU', 'Pega Pool': 'KW', 'KuCoinPool': 'SC',
        };
        var byCc = {};
        (pools.pools || []).forEach(function (p) {
          var cc = poolCountry[p.name] || 'XX';
          if (!byCc[cc]) byCc[cc] = { count: 0, blocks: 0, pools: [] };
          byCc[cc].count++;
          byCc[cc].blocks += p.blockCount || 0;
          byCc[cc].pools.push(p.name);
        });
        var totalBlocks = Object.values(byCc).reduce(function (s, v) { return s + v.blocks; }, 0);
        var sorted = Object.entries(byCc).filter(function (e) { return e[0] !== 'XX'; }).sort(function (a, b) { return b[1].blocks - a[1].blocks; });
        window._mapData = { type: 'mining', data: sorted, total: totalBlocks };
        renderMap(window._mapData);
        renderCountryList(sorted.map(function (e) { return [e[0], { count: e[1].blocks }]; }), totalBlocks, 'blocks');
      }
    } catch (e) {
      console.error('loadData error:', e);
      gs.innerHTML = '';
      var errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = t('load_fail') + '. ';
      var retryBtn = document.createElement('button');
      retryBtn.className = 'retry-btn';
      retryBtn.textContent = M.lang === 'en' ? 'Retry' : M.lang === 'ja' ? '\u518D\u8A66\u884C' : '\uC7AC\uC2DC\uB3C4';
      retryBtn.addEventListener('click', loadData);
      errDiv.appendChild(retryBtn);
      gs.appendChild(errDiv);
    }
  }

  // ── Render country list ──
  function renderCountryList(sorted, total, _unit) {
    var cl = document.getElementById('country-list');
    var lang = M.lang;
    var unitLabel = _unit === 'nodes' ? t('node_label') : t('block_label');
    var titleLabel = _unit === 'nodes'
      ? (lang === 'ko' ? '\uAD6D\uAC00\uBCC4 \uB178\uB4DC' : lang === 'ja' ? '\u56FD\u5225\u30CE\u30FC\u30C9' : 'Nodes by Country')
      : (lang === 'ko' ? '\uAD6D\uAC00\uBCC4 \uBE14\uB85D' : lang === 'ja' ? '\u56FD\u5225\u30D6\u30ED\u30C3\u30AF' : 'Blocks by Country');
    cl.innerHTML =
      '<h3 class="section-title">' + escHtml(titleLabel) + '</h3>' +
      '<div class="cl-header"><span>#</span><span>' + escHtml(t('country')) + '</span><span>' + escHtml(unitLabel) + '</span><span>%</span></div>' +
      sorted.map(function (entry, i) {
        var cc = entry[0];
        var v = entry[1];
        var val = v.count || 0;
        var pct = ((val / total) * 100).toFixed(1);
        return '<div class="cl-row">' +
          '<span class="cl-rank">' + (i + 1) + '</span>' +
          '<span class="cl-flag">' + escHtml(FLAGS[cc] || '') + '</span>' +
          '<span class="cl-name">' + escHtml(getName(cc)) + '</span>' +
          '<span class="cl-count">' + val.toLocaleString() + '</span>' +
          '<span class="cl-pct">' + pct + '%</span>' +
        '</div>';
      }).join('');
  }

  // ── Render map data on globe ──
  function renderMap(mapData) {
    if (!mapData || !globeState) return;
    if (worldGeoRaw) {
      globeState.buildCountryOutlines(worldGeoRaw);
      globeState.buildCountryFills(worldGeoRaw, mapData);
    }
    globeState.buildDataPoints(mapData);
    globeState.startArcAnimation();
  }

  // ── Update globe theme ──
  function updateGlobeTheme() {
    if (globeState && globeState.updateTheme) {
      globeState.updateTheme();
      var mapData = window._mapData;
      if (mapData && worldGeoRaw) {
        globeState.buildCountryOutlines(worldGeoRaw);
        globeState.buildCountryFills(worldGeoRaw, mapData);
        globeState.buildDataPoints(mapData);
      }
    }
  }

  // ── Three.js Globe ──
  async function initGlobe() {
    var THREE = await import('three');
    var OrbitControlsModule = await import('three/addons/controls/OrbitControls.js');
    var OrbitControls = OrbitControlsModule.OrbitControls;

    var canvas = document.getElementById('globe-canvas');
    if (!canvas) return;

    var GLOBE_RADIUS = 1.0;
    var isDark = function () { return document.documentElement.getAttribute('data-theme') !== 'light'; };

    // Scene setup
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.3, 3.0);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(isDark() ? 0x0d1117 : 0xf6f8fa);

    // Controls
    var controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // Auto-rotate idle logic
    var idleTimer = null;
    function onInteractionStart() {
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
    }
    function onInteractionEnd() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { controls.autoRotate = true; }, 3000);
    }
    canvas.addEventListener('pointerdown', onInteractionStart);
    canvas.addEventListener('pointerup', onInteractionEnd);
    canvas.addEventListener('wheel', function () { onInteractionStart(); onInteractionEnd(); });

    // Lighting
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Earth sphere (base)
    var earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    var earthMat = new THREE.MeshPhongMaterial({
      color: isDark() ? 0x161b22 : 0xe8ecf0,
      shininess: 5,
    });
    var earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Atmosphere glow (Fresnel-like via shader)
    var atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 64, 64);
    var atmosMat = new THREE.ShaderMaterial({
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        '  vNormal = normalize(normalMatrix * normal);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        '  float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);',
        '  gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 0.6;',
        '}'
      ].join('\n'),
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    var atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Country outlines group
    var bordersGroup = new THREE.Group();
    scene.add(bordersGroup);

    // Data points group
    var dataPointsGroup = new THREE.Group();
    scene.add(dataPointsGroup);

    // Arcs group
    var arcsGroup = new THREE.Group();
    scene.add(arcsGroup);

    // Lat/Lng to 3D
    function latLngToVector3(lat, lng, radius) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    // Build country outlines from TopoJSON
    function buildCountryOutlines(geoData) {
      while (bordersGroup.children.length > 0) {
        var child = bordersGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        bordersGroup.remove(child);
      }

      var dark = isDark();
      var borderColor = dark ? 0x30363d : 0xb8c0cc;

      var mesh = topojson.mesh(geoData, geoData.objects.countries);

      if (mesh && mesh.coordinates) {
        mesh.coordinates.forEach(function (line) {
          var points = [];
          line.forEach(function (coord) {
            points.push(latLngToVector3(coord[1], coord[0], GLOBE_RADIUS * 1.001));
          });
          if (points.length > 1) {
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var material = new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: 0.35 });
            var lineObj = new THREE.Line(geometry, material);
            bordersGroup.add(lineObj);
          }
        });
      }
    }

    // Build country filled regions on globe
    function buildCountryFills(geoData, mapData) {
      var features = topojson.feature(geoData, geoData.objects.countries).features;
      var valMap = {};
      var maxVal = 0;
      if (mapData && mapData.data) {
        mapData.data.forEach(function (entry) {
          var cc = entry[0];
          var val = entry[1].count || entry[1].blocks || 0;
          valMap[cc] = val;
          if (val > maxVal) maxVal = val;
        });
      }

      var dark = isDark();

      features.forEach(function (feature) {
        if (!feature.geometry) return;
        var name = feature.properties.name;
        var cc = NAME_TO_ISO2[name] || '';
        var val = valMap[cc] || 0;

        if (val <= 0) return;

        var coords = feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates
            : [];

        var intensity = maxVal > 0 ? Math.pow(val / maxVal, 0.4) : 0;
        var fillColor;
        if (dark) {
          fillColor = new THREE.Color(0x1c2030).lerp(new THREE.Color(0xf7931a), intensity);
        } else {
          fillColor = new THREE.Color(0xeaeef2).lerp(new THREE.Color(0xbc4e00), intensity);
        }

        coords.forEach(function (polygon) {
          polygon.forEach(function (ring) {
            var pts = [];
            ring.forEach(function (coord) {
              pts.push(latLngToVector3(coord[1], coord[0], GLOBE_RADIUS * 1.0015));
            });
            if (pts.length > 1) {
              var geo = new THREE.BufferGeometry().setFromPoints(pts);
              var mat = new THREE.LineBasicMaterial({ color: fillColor, transparent: true, opacity: 0.8, linewidth: 2 });
              bordersGroup.add(new THREE.Line(geo, mat));
            }
          });
        });
      });
    }

    // Build data points (glowing dots)
    var pointMeshes = [];

    function buildDataPoints(mapData) {
      while (dataPointsGroup.children.length > 0) {
        var child = dataPointsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
        dataPointsGroup.remove(child);
      }
      pointMeshes = [];
      if (!mapData) return;

      var dark = isDark();
      var maxVal = 0;
      var valMap = {};
      mapData.data.forEach(function (entry) {
        var cc = entry[0];
        var val = entry[1].count || entry[1].blocks || 0;
        valMap[cc] = val;
        if (val > maxVal) maxVal = val;
      });

      // Store for raycasting
      globeState._valMap = valMap;
      globeState._maxVal = maxVal;
      globeState._mapData = mapData;

      // Create glow texture
      var glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64;
      glowCanvas.height = 64;
      var ctx = glowCanvas.getContext('2d');
      var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(247,147,26,1)');
      gradient.addColorStop(0.25, 'rgba(247,147,26,0.6)');
      gradient.addColorStop(0.6, 'rgba(247,147,26,0.15)');
      gradient.addColorStop(1, 'rgba(247,147,26,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      var glowTexture = new THREE.CanvasTexture(glowCanvas);

      mapData.data.forEach(function (entry) {
        var cc = entry[0];
        var v = entry[1];
        var cen = CENTROIDS[cc];
        if (!cen) return;
        var val = v.count || v.blocks || 0;
        if (val <= 0) return;

        var pos = latLngToVector3(cen[1], cen[0], GLOBE_RADIUS * 1.005);
        var sizeFactor = Math.sqrt(val / maxVal);
        var baseSize = 0.02 + sizeFactor * 0.07;

        // Glow sprite
        var spriteMat = new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.4 + sizeFactor * 0.5,
        });
        var sprite = new THREE.Sprite(spriteMat);
        sprite.position.copy(pos);
        sprite.scale.set(baseSize * 3, baseSize * 3, 1);
        sprite._cc = cc;
        sprite._baseScale = baseSize * 3;
        dataPointsGroup.add(sprite);

        // Solid center dot
        var dotGeo = new THREE.SphereGeometry(baseSize * 0.4, 8, 8);
        var dotIntensity = 0.4 + sizeFactor * 0.6;
        var dotColor = dark
          ? new THREE.Color(0xf7931a).multiplyScalar(dotIntensity)
          : new THREE.Color(0xbc4e00).multiplyScalar(dotIntensity);
        var dotMat = new THREE.MeshBasicMaterial({ color: dotColor });
        var dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.position.copy(pos);
        dotMesh._cc = cc;
        dataPointsGroup.add(dotMesh);

        pointMeshes.push({ sprite: sprite, dotMesh: dotMesh, baseSize: baseSize * 3, cc: cc });
      });
    }

    // Connection arcs between top countries
    function createArc(fromCC, toCC) {
      var fromCen = CENTROIDS[fromCC];
      var toCen = CENTROIDS[toCC];
      if (!fromCen || !toCen) return;

      var start = latLngToVector3(fromCen[1], fromCen[0], GLOBE_RADIUS * 1.005);
      var end = latLngToVector3(toCen[1], toCen[0], GLOBE_RADIUS * 1.005);

      var mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      var dist = start.distanceTo(end);
      mid.normalize().multiplyScalar(GLOBE_RADIUS + dist * 0.35);

      var curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      var arcPoints = curve.getPoints(50);
      var arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
      var arcMat = new THREE.LineBasicMaterial({
        color: 0xf7931a,
        transparent: true,
        opacity: 0,
      });
      var arcLine = new THREE.Line(arcGeo, arcMat);
      arcsGroup.add(arcLine);

      var startTime = performance.now();
      var duration = 4000;

      function animateArc() {
        var elapsed = performance.now() - startTime;
        var progress = elapsed / duration;

        if (progress >= 1) {
          arcsGroup.remove(arcLine);
          arcGeo.dispose();
          arcMat.dispose();
          return;
        }

        if (progress < 0.5) {
          var drawRange = Math.floor(progress * 2 * 51);
          arcGeo.setDrawRange(0, drawRange);
          arcMat.opacity = Math.min(progress * 4, 0.5);
        } else if (progress < 0.75) {
          arcGeo.setDrawRange(0, 51);
          arcMat.opacity = 0.5;
        } else {
          arcGeo.setDrawRange(0, 51);
          arcMat.opacity = 0.5 * (1 - (progress - 0.75) / 0.25);
        }

        requestAnimationFrame(animateArc);
      }
      requestAnimationFrame(animateArc);
    }

    var ARC_PAIRS = [
      ['US','DE'],['US','GB'],['US','CN'],['US','JP'],['US','SG'],
      ['DE','NL'],['DE','FR'],['GB','FR'],['CN','JP'],['US','CA'],
      ['US','BR'],['DE','CH'],['JP','KR'],['US','AU'],['GB','IN'],
      ['FR','IT'],['DE','PL'],['US','MX'],['CN','HK'],['SG','AU'],
    ];

    var arcInterval = null;
    function startArcAnimation() {
      if (arcInterval) clearInterval(arcInterval);
      for (var i = 0; i < 3; i++) {
        var pair = ARC_PAIRS[Math.floor(Math.random() * ARC_PAIRS.length)];
        createArc(pair[0], pair[1]);
      }
      arcInterval = setInterval(function () {
        var pair = ARC_PAIRS[Math.floor(Math.random() * ARC_PAIRS.length)];
        createArc(pair[0], pair[1]);
      }, 2500);
    }

    // Raycaster for hover/click
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var hoveredCC = null;

    function onMouseMove(event) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(dataPointsGroup.children, true);

      var tooltip = document.getElementById('map-tooltip');

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        var cc = obj._cc;
        if (cc && globeState._valMap && globeState._valMap[cc]) {
          hoveredCC = cc;
          var val = globeState._valMap[cc];
          var total = globeState._mapData?.total || 1;
          var pct = ((val / total) * 100).toFixed(1);
          var label = currentTab === 'ln' ? t('node_label') : t('block_label');
          tooltip.innerHTML = '<b>' + escHtml(FLAGS[cc] || '') + ' ' + escHtml(getName(cc)) + '</b><br>' + val.toLocaleString() + ' ' + escHtml(label) + ' (' + pct + '%)';
          tooltip.style.setProperty('--x', (event.clientX - rect.left + 12) + 'px');
          tooltip.style.setProperty('--y', (event.clientY - rect.top - 10) + 'px');
          tooltip.classList.remove('hidden');
          canvas.style.cursor = 'pointer';
        }
      } else {
        if (hoveredCC) {
          tooltip.classList.add('hidden');
          hoveredCC = null;
          canvas.style.cursor = 'grab';
        }
      }
    }

    function onClick(event) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(dataPointsGroup.children, true);

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        var cc = obj._cc;
        if (cc && globeState._valMap && globeState._valMap[cc]) {
          var val = globeState._valMap[cc];
          var mapData = globeState._mapData;
          var total = mapData?.total || 1;
          var pct = ((val / total) * 100).toFixed(1);
          var rank = mapData.data.findIndex(function (entry) { return entry[0] === cc; }) + 1;
          var label = currentTab === 'ln' ? t('node_label') : t('block_label');

          // Highlight country in list
          var rows = document.querySelectorAll('.cl-row');
          rows.forEach(function (r) { r.classList.remove('highlighted'); });
          var name = getName(cc);
          rows.forEach(function (r) {
            if (r.querySelector('.cl-name')?.textContent === name) {
              r.classList.add('highlighted');
              r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });

          var detail = document.getElementById('map-detail');
          if (detail) detail.innerHTML = '<span class="flag-lg">' + (FLAGS[cc] || '') + '</span> <b>' + getName(cc) + '</b> &nbsp;<span class="rank-label">#' + rank + '</span><br><span class="accent fw700">' + val.toLocaleString() + '</span> ' + label + ' · <span class="pct-label">' + pct + '%</span>';
        }
      }
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    // Touch support
    canvas.addEventListener('touchend', function (e) {
      if (e.changedTouches.length > 0) {
        var touch = e.changedTouches[0];
        var mouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        onClick(mouseEvent);
      }
    });

    // ── Spark / Pulse Effects ──
    // Randomly pulse 2-3 data points every few seconds to show "network alive"
    var sparkTargets = [];   // [{pm, startTime, duration}]
    var lastSparkTime = 0;
    var SPARK_INTERVAL = 3.5; // seconds between spark bursts
    var SPARK_DURATION = 1.2; // each spark animation duration

    function triggerSparks(elapsed) {
      if (pointMeshes.length === 0) return;
      if (elapsed - lastSparkTime < SPARK_INTERVAL) return;
      lastSparkTime = elapsed;

      // Pick 2-3 random data points
      var count = 2 + Math.floor(Math.random() * 2); // 2 or 3
      var available = pointMeshes.slice();
      for (var s = 0; s < count && available.length > 0; s++) {
        var idx = Math.floor(Math.random() * available.length);
        var pm = available.splice(idx, 1)[0];
        sparkTargets.push({ pm: pm, startTime: elapsed, duration: SPARK_DURATION });
      }
    }

    function updateSparks(elapsed) {
      for (var i = sparkTargets.length - 1; i >= 0; i--) {
        var spark = sparkTargets[i];
        var progress = (elapsed - spark.startTime) / spark.duration;
        if (progress >= 1) {
          // Reset to normal
          spark.pm.sprite.material.opacity = spark.pm._baseOpacity || 0.7;
          sparkTargets.splice(i, 1);
          continue;
        }
        // Ease-out pulse: scale up quickly then ease back
        var eased = progress < 0.3
          ? progress / 0.3  // ramp up
          : 1 - (progress - 0.3) / 0.7; // ease back down
        var scaleMult = 1 + eased * 0.6;  // up to 60% larger
        var opacityBoost = eased * 0.4;    // brighter during pulse
        spark.pm.sprite.scale.set(
          spark.pm.baseSize * scaleMult,
          spark.pm.baseSize * scaleMult,
          1
        );
        spark.pm.sprite.material.opacity = (spark.pm._baseOpacity || 0.7) + opacityBoost;
      }
    }

    // Store base opacity on each point mesh for spark restoration
    function storeBaseOpacities() {
      pointMeshes.forEach(function (pm) {
        pm._baseOpacity = pm.sprite.material.opacity;
      });
    }

    // Animation loop
    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var elapsed = clock.getElapsedTime();

      controls.update();

      // Store base opacities once after data points are built
      if (pointMeshes.length > 0 && !pointMeshes[0]._baseOpacity) {
        storeBaseOpacities();
      }

      // Gentle ambient pulse on all data points
      if (pointMeshes.length > 0) {
        pointMeshes.forEach(function (pm) {
          // Skip points currently being sparked (handled by updateSparks)
          for (var si = 0; si < sparkTargets.length; si++) {
            if (sparkTargets[si].pm === pm) return;
          }
          var pulse = 1 + Math.sin(elapsed * 2 + pm.cc.charCodeAt(0)) * 0.12;
          pm.sprite.scale.set(pm.baseSize * pulse, pm.baseSize * pulse, 1);
        });
      }

      // Spark effects — periodic random pulses
      triggerSparks(elapsed);
      updateSparks(elapsed);

      renderer.render(scene, camera);
    }

    // Handle resize
    function handleResize() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }

    window.addEventListener('resize', handleResize);

    // Store state for external access
    globeState = {
      scene: scene, camera: camera, renderer: renderer, controls: controls,
      earthMesh: earthMesh, atmosMesh: atmosMesh,
      bordersGroup: bordersGroup, dataPointsGroup: dataPointsGroup, arcsGroup: arcsGroup,
      buildCountryOutlines: buildCountryOutlines,
      buildCountryFills: buildCountryFills,
      buildDataPoints: buildDataPoints,
      startArcAnimation: startArcAnimation,
      GLOBE_RADIUS: GLOBE_RADIUS, latLngToVector3: latLngToVector3, isDark: isDark,
      THREE: THREE,
      _valMap: {},
      _maxVal: 0,
      _mapData: null,
      handleResize: handleResize,
      updateTheme: function () {
        var dark = isDark();
        renderer.setClearColor(dark ? 0x0d1117 : 0xf6f8fa);
        earthMat.color.set(dark ? 0x161b22 : 0xe8ecf0);
        earthMat.needsUpdate = true;
      },
    };

    animate();
    return globeState;
  }

  // ── Init: load globe + world data + API data ──
  async function init() {
    try {
      await initGlobe();

      var geo = await fetchRetry('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', 15000).then(function (r) { return r.json(); });
      worldGeoRaw = geo;

      loadData();
    } catch (e) {
      console.error('init error:', e);
      worldGeoRaw = null;
      loadData();
    }
  }
  init();

  // ── Expose on shared namespace ──
  M.globeState = globeState; // Will be null until initGlobe resolves; access via M.getGlobeState
  M.getGlobeState = function () { return globeState; };
  M.switchTab = switchTab;
  M.loadData = loadData;
  M.renderMap = renderMap;
  M.updateGlobeTheme = updateGlobeTheme;
  M.renderCountryList = renderCountryList;
})();
