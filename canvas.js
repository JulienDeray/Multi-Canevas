//document.addEventListener('DOMContentLoaded', init);

//var canvas;
//var ctxt;
var initDone = false;
var currentBrush = [];
var brushName;
var userId;

var knownClients = [];

var defaultCtxt;

var ctxts = [];
var canvasS = [];

function init( id ) {
    canvasS[id].setAttribute('width', window.innerWidth);
    canvasS[id].setAttribute('height', window.innerHeight - 50);

    var controls = document.querySelector('#controls');
    controls.setAttribute('userid', id);

    controls.addEventListener('click', function(event) {
        var brush = event.target.getAttribute('data-brush');
        var id = event.target.parentNode.getAttribute('userid');
        if (brush)
            brushName = brush;
        changeBrush(brush, id);
    });

    var dummyCanvas = document.createElement('canvas');
    defaultCtxt = dummyCanvas.getContext('2d');

    changeBrush('randomWidthPencil', id);
    brushName = "randomWidthPencil";

    canvasS[id].addEventListener('mousedown', sendMouseDown);
    canvasS[id].addEventListener('mouseup', sendMouseUp);
}

// Setup WebSocket

var url = 'ws:' + document.URL.split(':')[1] + ':8080';
var ws = new WebSocket(url);
ws.onopen = function() { console.log('CONNECTED'); };
ws.onclose = function() { console.log('DISCONNECTED'); };
ws.onmessage = function(event) {
    var point = JSON.parse(event.data);

    switch ( point.message ) {
        case 'addCanevas' :
            addCanevas( ( point.userId ) );
            break;
        case 'mousedown' :
            if ( knownClients.indexOf( point.userId ) < 0 )
                addCanevas( point.userId );
            startDrawing(point);
            break;
        case 'mouseup' :
            stopDrawing(point);
            break;
        case 'default' :
            draw(point);
            break;
    }
};

function addCanevas( newUserId ) {
    console.log(' add canevas id : ' + newUserId );

    knownClients.push( newUserId );
    var newNode = document.createElement('canvas');
    newNode.setAttribute('style', 'position: absolute; margin-top: 30px');
    newNode.setAttribute('id', newUserId);

    if ( !initDone ) {
        initDone = true;
        newNode.style.zIndex = 9999;
    }

    document.getElementById('canevas').appendChild( newNode );

    canvasS[newUserId] = newNode;
    ctxts[newUserId] = newNode.getContext('2d');

    currentBrush[newUserId] = brushes;

    init( newUserId );
}

function send(event) {
    var point = { message: 'default', x: event.pageX, y: event.pageY, brush : brushName, userId: userId };
    ws.send(JSON.stringify(point));
}

function sendMouseDown(event) {
    var message = { message: 'mousedown', clientX: event.clientX, clientY: event.clientY, userId: userId };
    ws.send( JSON.stringify( message ) );
}

function sendMouseUp(event) {
    var message = { message: 'mouseup', clientX: event.clientX, clientY: event.clientY, userId: userId };
    ws.send( JSON.stringify( message ) );
}

function startDrawing(event) {
    if ( canvasS[event.userId] == undefined )
        canvasS[event.userId] = document.getElementById( event.userId );
    canvasS[event.userId].addEventListener('mousemove', send);
    currentBrush[event.userId].down({ x: event.clientX, y: event.clientY - 30});
}

function stopDrawing(event) {
    canvasS[event.userId].removeEventListener('mousemove', send);
    currentBrush[event.userId].up({ x: event.x, y: event.y - 30});
}

function draw(event) {
    changeBrush(event.brush, event.userId);
    currentBrush[event.userId].move({ x: event.x, y: event.y - 30, userId: event.userId});
}

function changeBrush(brush, id) {
    brushes.id = id;
    currentBrush[id] = brushes[brush];
    restoreDefaults(id);
    currentBrush[id].setup(id);
}

function restoreDefaults(id) {
    var prop = [
        'fillStyle',
        'strokeStyle',
        'globalAlpha',
        'lineWidth',
        'lineJoin',
        'lineCap',
        'shadowBlur',
        'shadowColor'
    ];

    prop.forEach(function(p) {
        ctxts[id][p] = defaultCtxt[p];
    });
}

// Brushes based on http://perfectionkills.com/exploring-canvas-drawing-techniques/

var brushes = {};

brushes.simplePencil = {
    setup: function(id) {
        ctxts[id].lineWidth = 1;
        ctxts[id].lineJoin = ctxt.lineCap = 'round';
    },

    down: function(point) {
        ctxts[point.userId].beginPath();
        ctxts[point.userId].moveTo(point.x, point.y);
    },

    move: function(point) {
        ctxts[point.userId].lineTo(point.x, point.y);
        ctxts[point.userId].stroke();
    },

    up: function(point) {}
};

brushes.smoothPencil = {
    __proto__: brushes.simplePencil,

    setup: function(id) {
        ctxts[id].lineWidth = 10;
        ctxts[id].lineJoin = ctxt.lineCap = 'round';
    }
};

brushes.edgeSmoothPencil = {
    __proto__: brushes.smoothPencil,

    setup: function(id) {
        ctxts[id].lineWidth = 3;
        ctxts[id].lineJoin = ctxt.lineCap = 'round';
        ctxts[id].shadowBlur = 10;
        ctxts[id].shadowColor = 'black';
    }
};

brushes.pointsPencil = {
    __proto__: brushes.simplePencil,

    setup: function(id) {
        ctxts[id].lineWidth = 7;
        ctxts[id].lineJoin = ctxts[id].lineCap = 'round';
    },

    down: function(point) {
        this.lastPoint = point;
    },

    move: function(point) {
        this.draw(point);
        this.lastPoint = point;
    },

    draw: function(point) {
        ctxts[point.userId].beginPath();
        ctxts[point.userId].moveTo(this.lastPoint.x, this.lastPoint.y);
        ctxts[point.userId].lineTo(point.x, point.y);
        ctxts[point.userId].stroke();
    }
};

brushes.gradientPencil = {
    __proto__: brushes.pointsPencil,

    draw: function(point) {
        var gradient = ctxts[point.userId].createRadialGradient(point.x, point.y, 5,
            point.x, point.y, 10);

        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctxts[point.userId].fillStyle = gradient;
        ctxts[point.userId].fillRect(point.x - 10, point.y - 10, 20, 20);
    }
}

brushes.interpolatedPencil = {
    __proto__: brushes.gradientPencil,

    move: function(point) {
        // Polar coordinates
        var d = utils.distanceBetween(this.lastPoint, point);
        var th = utils.angleBetween(this.lastPoint, point);
        var interPoint = { x: this.lastPoint.x, y: this.lastPoint.y, userId: point.userId };
        var step = 3;

        for (var i = step; i < d; i += step) {
            interPoint.x += Math.cos(th) * step;
            interPoint.y += Math.sin(th) * step;
            this.draw(interPoint);
            this.lastPoint = interPoint;
        }

        this.draw(point);
        this.lastPoint = point;
    },
};

brushes.interpolatedEraser = {
    __proto__: brushes.interpolatedPencil,

    draw: function(point) {
        var gradient = ctxts[point.userId].createRadialGradient(point.x, point.y, 10,
            point.x, point.y, 20);

        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctxts[point.userId].fillStyle = gradient;
        ctxts[point.userId].fillRect(point.x - 20, point.y - 20, 40, 40);
    },
};

brushes.randomWidthPencil = {
    __proto__: brushes.pointsPencil,

    draw: function(point) {
        ctxts[point.userId].lineWidth = Math.random() * 2 + 3;
        this.__proto__.draw.call(this, point);
    }
};

brushes.dotsPencil = {
    setup: function() {},
    down: function(point) {},

    move: function(point) {
        ctxts[point.userId].beginPath();
        ctxts[point.userId].arc(point.x, point.y, Math.random() * 15 + 5, false, Math.PI * 2);
        ctxts[point.userId].fill();
    },

    up: function(point) {},
};

brushes.trippyDots = {
    __proto__: brushes.dotsPencil,

    setup: function(id) {
        ctxts[id].fillStyle = utils.hueToColor(utils.randomHue());
    },

    move: function(point) {
        ctxts[point.userId].globalAlpha = Math.random();
        this.__proto__.move.call(this, point);
    },
};

brushes.neighborPointsPencil = {
    __proto__: brushes.pointsPencil,

    setup: function(id) {
        ctxts[id].lineWidth = 1;
        this.points = [];
    },

    down: function(point) {
        this.points.push(point);
    },

    draw: function(point) {
        this.points.push(point);

        var p1 = this.points[this.points.length - 1];
        var p2 = this.points[this.points.length - 2];

        ctxts[point.userId].beginPath();
        ctxts[point.userId].moveTo(p2.x, p2.y);
        ctxts[point.userId].lineTo(p1.x, p1.y);
        ctxts[point.userId].stroke();

        for (var i = 0, len = this.points.length; i < len; i++) {
            dx = this.points[i].x - p1.x;
            dy = this.points[i].y - p1.y;
            d = dx * dx + dy * dy;

            if (d < 1000) {
                ctxts[point.userId].beginPath();
                ctxts[point.userId].strokeStyle = 'rgba(0,0,0,0.3)';
                ctxts[point.userId].moveTo(p1.x + (dx * 0.2), p1.y + (dy * 0.2));
                ctxts[point.userId].lineTo(this.points[i].x - (dx * 0.2), this.points[i].y - (dy * 0.2));
                ctxts[point.userId].stroke();
            }
        }
    },

    up: function(point) {
        this.points.length = 0;
    }
};

var utils = {
    distanceBetween: function(point1, point2) {
        return Math.sqrt((point1.x - point2.x) * (point1.x - point2.x)
            + (point1.y - point2.y) * (point1.y - point2.y));
    },
    angleBetween: function(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    },

    randomHue: function() {
        return Math.floor(Math.random() * 360);
    },

    hueToColor: function(hue) {
        return 'hsl(' + hue + ', 60%, 50%)';
    }
};

