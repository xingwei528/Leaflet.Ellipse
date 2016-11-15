L.SVG.include ({
    _updateEllipse: function (layer) {
        var c = layer._point,
            rx = layer._radiusX,
            ry = layer._radiusY,
            phi = layer._tiltDeg,
            endPoint = layer._endPointParams;

        var d = 'M' + endPoint.x0 + ',' + endPoint.y0 +
            'A' + rx + ',' + ry + ',' + phi + ',' +
            endPoint.largeArc + ',' + endPoint.sweep + ',' +
            endPoint.x1 + ',' + endPoint.y1 + ' z';
        this._setPath(layer, d);
    },
});

L.Canvas.include ({
    _updateEllipse: function (layer) {
        if (layer._empty()) { return; }

        var p = layer._point,
            ctx = this._ctx,
            r = layer._radiusX,
            s = (layer._radiusY || r) / r;

        this._drawnLayers[layer._leaflet_id] = layer;

        if (s !== 1) {
            ctx.save();
            ctx.scale(1, s);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

        if (s !== 1) {
            ctx.restore();
        }

        this._fillStroke(ctx, layer);
    },
});

L.Ellipse = L.Path.extend({

	options: {
		fill: true,
        startAngle: 0,
        endAngle: 359.9
	},

    initialize: function (latlng, radii, tilt, options) {

        L.setOptions(this, options);
        this._latlng = L.latLng(latlng);

        if (tilt) {
            this._tiltDeg = tilt;
        } else {
            this._tiltDeg = 0;
        }

        if (radii) {
            this._mRadiusX = radii[0];
            this._mRadiusY = radii[1];
            this._mRadius = this._mRadiusX;
        }
    },

    setRadius: function (radii) {
        this._mRadiusX = radii[0];
        this._mRadiusY = radii[1];
        return this.redraw();
    },

    getRadius: function () {
        return new L.point(this._mRadiusX, this._mRadiusY);
    },

    setTilt: function (tilt) {
        this._tiltDeg = tilt;
        return this.redraw();
    },

    getBounds: function () {
        var lngRadius = this._getLngRadius(),
            latRadius = this._getLatRadius(),
            latlng = this._latlng;

        return new L.LatLngBounds(
            [latlng.lat - latRadius, latlng.lng - lngRadius],
            [latlng.lat + latRadius, latlng.lng + lngRadius]);
    },

	// @method setLatLng(latLng: LatLng): this
	// Sets the position of a circle marker to a new location.
	setLatLng: function (latlng) {
		this._latlng = L.latLng(latlng);
		this.redraw();
		return this.fire('move', {latlng: this._latlng});
	},

	// @method getLatLng(): LatLng
	// Returns the current geographical position of the circle marker
	getLatLng: function () {
		return this._latlng;
	},

    setStyle: L.Path.prototype.setStyle,

    _project: function () {
        var lngRadius = this._getLngRadius(),
            latRadius = this._getLatRadius(),
            latlng = this._latlng,
            pointLeft = this._map.latLngToLayerPoint([latlng.lat, latlng.lng - lngRadius]),
            pointBelow = this._map.latLngToLayerPoint([latlng.lat - latRadius, latlng.lng]);

        this._point = this._map.latLngToLayerPoint(latlng);
        this._radiusX = Math.max(this._point.x - pointLeft.x, 1);
        this._radiusY = Math.max(pointBelow.y - this._point.y, 1);
        this._endPointParams = this._centerPointToEndPoint();
        this._updateBounds();
    },

	_updateBounds: function () {
		var rx = this._radiusX,
		    ry = this._radiusY,
		    w = this._clickTolerance(),
		    p = [rx + w, ry + w];
		this._pxBounds = new L.Bounds(this._point.subtract(p), this._point.add(p));
	},

	_update: function () {
		if (this._map) {
			this._updatePath();
		}
	},

	_updatePath: function () {
		this._renderer._updateEllipse(this);
	},

    _getLatRadius: function () {
        return (this._mRadiusY / 40075017) * 360;
    },

    _getLngRadius: function () {
        return ((this._mRadiusX / 40075017) * 360) / Math.cos((Math.PI / 180) * this._latlng.lat);
    },

    _centerPointToEndPoint: function () {
        // Convert between center point parameterization of an ellipse
        // too SVG's end-point and sweep parameters.  This is an
        // adaptation of the perl code found here:
        // http://commons.oreilly.com/wiki/index.php/SVG_Essentials/Paths
        var c = this._point,
            rx = this._radiusX,
            ry = this._radiusY,
            theta2 = (this.options.startAngle + this.options.endAngle) * (Math.PI / 180),
            theta1 = this.options.startAngle * (Math.PI / 180),
            delta = this.options.endAngle,
            phi = this._tiltDeg * (Math.PI / 180);

        // Determine start and end-point coordinates
        var x0 = c.x + Math.cos(phi) * rx * Math.cos(theta1) +
            Math.sin(-phi) * ry * Math.sin(theta1);
        var y0 = c.y + Math.sin(phi) * rx * Math.cos(theta1) +
            Math.cos(phi) * ry * Math.sin(theta1);

        var x1 = c.x + Math.cos(phi) * rx * Math.cos(theta2) +
            Math.sin(-phi) * ry * Math.sin(theta2);
        var y1 = c.y + Math.sin(phi) * rx * Math.cos(theta2) +
            Math.cos(phi) * ry * Math.sin(theta2);

        var largeArc = (delta > 180) ? 1 : 0;
        var sweep = (delta > 0) ? 1 : 0;

        return {'x0': x0, 'y0': y0, 'tilt': phi, 'largeArc': largeArc,
            'sweep': sweep, 'x1': x1, 'y1': y1};
    },

	_empty: function () {
		return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
	},

    _containsPoint : function (p) {
        // TODO

        return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
    }
});

L.ellipse = function (latlng, radii, tilt, options) {
    return new L.Ellipse(latlng, radii, tilt, options);
};
