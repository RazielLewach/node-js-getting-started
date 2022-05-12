module.exports = {
	angular: function(_dir)
	{
		return (_dir%360 + 360)%360;
	},

	pointDirection: function(_x1,_y1,_x2,_y2)
	{
		return angular(Math.atan2(-(_y1-_y2),_x1-_x2)*180/Math.PI);
	},

	tiendeAX: function(_val,_obj,_inc)
	{
		var _ret = _val;

		if ( _inc == 0 ) return _obj;

		if ( _ret < _obj ) _ret = Math.min( _ret + _inc, _obj );
		else _ret = Math.max( _ret - _inc, _obj );

		return _ret;
	}

	dcos: function(_ang)
	{
		return Math.cos(_ang*Math.PI/180);
	},

	dsin: function(_ang)
	{
		return Math.sin(_ang*Math.PI/180);
	},

	pointDistance: function(_x1,_y1,_x2,_y2)
	{
		return Math.sqrt(Math.pow(_x1-_x2,2)+Math.pow(_y1-_y2,2));
	},

	absAngleDifference: function(_a1,_a2)
	{
		var _phi = Math.abs(_a2-_a1)%360;
		var _distance = _phi > 180 ? 360 - _phi : _phi;
		return _distance;
	},
}