var req = require( 'request' );
var server = require( './server.js' )( req );

module.exports = function() {
	var args = Array.prototype.slice.call( arguments );
	var service, config;
	if( args[ 0 ].Address ) {
		service = args[ 0 ];
		config = args[ 1 ] || {};
	} else {
		service = {};
		config = args[ 0 ] || {};
	}
	return server( service, config );
};