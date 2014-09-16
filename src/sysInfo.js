var os = require( 'os' );
var config = require( './config.js' );

function getInfo() {
	return {
		name: os.hostname(),
		os: os.type(),
		platform: os.platform(),
		arch: os.arch(),
		version: os.release(),
		osName: ( config.os ? config.os.name : undefined ) || 'any',
		osVersion: ( config.os ? config.os.version : undefined ) || 'any'
	};
}

module.exports = getInfo;