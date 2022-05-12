function angular(_dir)
{
	return (_dir%360 + 360)%360;
}

function pointDirection(_x1,_y1,_x2,_y2)
{
	return angular(Math.atan2(-(_y1-_y2),_x1-_x2)*180/Math.PI);
}

function tiendeAX(_val,_obj,_inc)
{
	var _ret = _val;

	if ( _inc == 0 ) return _obj;

	if ( _ret < _obj ) _ret = Math.min( _ret + _inc, _obj );
	else _ret = Math.max( _ret - _inc, _obj );

	return _ret;
}

function dcos(_ang)
{
	return Math.cos(_ang*Math.PI/180);
}

function dsin(_ang)
{
	return Math.sin(_ang*Math.PI/180);
}

function pointDistance(_x1,_y1,_x2,_y2)
{
	return Math.sqrt(Math.pow(_x1-_x2,2)+Math.pow(_y1-_y2,2));
}

function absAngleDifference(_a1,_a2)
{
	var _phi = Math.abs(_a2-_a1)%360;
	var _distance = _phi > 180 ? 360 - _phi : _phi;
	return _distance;
}