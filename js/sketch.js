let canción;
let analizador;
let reproduciendo = false;

let btnPlay, btnRewind, btnForward;
let seekTrack, seekFill, seekThumb;
let tiempoActual, tiempoTotal;
let volTrack, volFill, volThumb;

let espectroSmooth = [];
let volumen = 0.8;

function preload() {
    canción = loadSound('../assets/ponte-a-trabajar.mp3');
}

function setup() {
    let lienzo = createCanvas(820, 400);
    lienzo.parent('canvasContainer');

    analizador = new p5.FFT(0.82, 64);

    btnPlay = select('#btnPlay');
    btnRewind = select('#btnRewind');
    btnForward = select('#btnForward');
    seekTrack = select('#seekBar');
    seekFill = select('#seekProgress');
    seekThumb = select('#seekThumb');
    tiempoActual = select('#timeElapsed');
    tiempoTotal = select('#timeDuration');
    volTrack = select('#volumeBar');
    volFill = select('#volumeFill');
    volThumb = select('#volumeThumb');

    btnPlay.mousePressed(togglePlay);
    btnRewind.mousePressed(() => saltar(-5));
    btnForward.mousePressed(() => saltar(5));

    canción.setVolume(volumen);

    for (let i = 0; i < 64; i++) {
        espectroSmooth[i] = 0;
    }

    configurarBarra(seekTrack.elt, (pct) => {
        if (!canción || canción.duration() === 0) return;
        canción.jump(pct * canción.duration());
    });

    configurarBarra(volTrack.elt, (pct) => {
        volumen = pct;
        canción.setVolume(volumen);
        actualizarVolumen();
    });

    actualizarVolumen();
}

function draw() {
    background(10, 10, 10);

    let espectro = analizador.analyze();

    for (let i = 0; i < espectro.length && i < espectroSmooth.length; i++) {
        espectroSmooth[i] = lerp(espectroSmooth[i], espectro[i], 0.2);
    }

    let graves = analizador.getEnergy('bass');
    let medios = analizador.getEnergy('mid');
    let agudos = analizador.getEnergy('treble');

    dibujarBarras(espectroSmooth, graves);
    dibujarPuntero(graves, agudos);
    actualizarSeekBar();
}

function dibujarBarras(espectro, graves) {
    let margen = 20;
    let anchoUtil = width - margen * 2;
    let cant = espectro.length;
    let anchoBarra = anchoUtil / cant;
    let yBase = height - 20;

    let pulso = map(graves, 0, 255, 1, 1.3);

    for (let i = 0; i < cant; i++) {
        let v = espectro[i] * pulso;
        let h = map(v, 0, 255, 0, height * 0.6);
        h = max(h, 2);

        let t = i / cant;
        let r = lerp(30, 140, t);
        let g = lerp(185, 80, t);
        let b = lerp(84, 245, t);
        let a = map(v, 0, 255, 80, 220);

        noStroke();
        fill(r, g, b, a);

        let x = margen + i * anchoBarra;
        let w = anchoBarra * 0.7;

        rect(x, yBase - h, w, h, 2);
    }
}

function dibujarPuntero(graves, agudos) {
    let radio = map(graves, 0, 255, 15, 50);
    let rot = map(agudos, 0, 255, 0, TWO_PI);

    push();
    translate(mouseX, mouseY);
    rotate(rot);

    noStroke();
    fill(29, 185, 84, map(graves, 0, 255, 30, 100));
    ellipse(0, 0, radio * 2);

    stroke(255, 255, 255, 60);
    strokeWeight(1);
    noFill();
    ellipse(0, 0, radio * 2.8);

    fill(255, 200);
    noStroke();
    ellipse(0, 0, 6);

    pop();
}

function actualizarSeekBar() {
    let act = canción.currentTime() || 0;
    let dur = canción.duration() || 0;

    tiempoActual.html(formatear(act));
    tiempoTotal.html(formatear(dur));

    let pct = dur > 0 ? (act / dur) * 100 : 0;
    seekFill.style('width', pct + '%');
    seekThumb.style('left', pct + '%');
}

function actualizarVolumen() {
    let pct = volumen * 100;
    volFill.style('width', pct + '%');
    volThumb.style('left', pct + '%');
    volFill.style('background', volumen > 0 ? '#1db954' : '#4d4d4d');
}

function formatear(s) {
    if (isNaN(s)) return '0:00';
    let m = floor(s / 60);
    let seg = floor(s % 60);
    return m + ':' + (seg < 10 ? '0' : '') + seg;
}

function togglePlay() {
    if (getAudioContext().state === 'suspended') {
        getAudioContext().resume();
    }

    if (reproduciendo) {
        canción.pause();
        reproduciendo = false;
        btnPlay.html(
            '<svg class="play-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
            '<polygon points="6,4 20,12 6,20"/></svg>'
        );
    } else {
        canción.play();
        reproduciendo = true;
        btnPlay.html(
            '<svg class="play-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
            '<rect x="6" y="4" width="4" height="16" rx="1"/>' +
            '<rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
        );
    }
}

function saltar(seg) {
    if (!canción || canción.duration() === 0) return;
    let t = constrain(canción.currentTime() + seg, 0, canción.duration());
    canción.jump(t);
}

function configurarBarra(el, callback) {
    if (!el) return;

    function mover(e) {
        let rect = el.getBoundingClientRect();
        let x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        let pct = constrain(x / rect.width, 0, 1);
        callback(pct);
    }

    el.addEventListener('mousedown', (e) => {
        mover(e);
        function onMove(ev) { mover(ev); }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    el.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault();
        mover(e);
        function onMove(ev) { mover(ev); }
        function onUp() {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        }
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    });
}