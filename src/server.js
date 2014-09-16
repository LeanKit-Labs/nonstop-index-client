var when = require( 'when' );
var _ = require( 'lodash' );
var debug = require( 'debug' )( 'continua:hub-client' );
var path = require( 'path' );
var fs = require( 'fs' );
var mkdirp = require( 'mkdirp' );
var sysInfo = require( './sysInfo.js' )();
var nodeWhen = require( 'when/node' );
var host, port, protocol, req, request;
var projectName, appServer, apiRoot, files, architecture, platform;
var osName, osVersion, version, build, branch, owner, downloads, installed;
var frequency, downloadUrl, listUrl, fileFilter, uploadUrl;
var packageList, uploads;

function addAuth( options, auth1, auth2 ) {
	if( auth2 ) {
		options.auth = { user: auth1, pass: auth2 };
	} else {
		options.auth = {
			bearer: auth1
		};
	}
}

function configure( config, service ) {
	host = service.Address || config.host;
	port = service.Port || config.port;
	protocol = port === 443 || config.https ? 'https' : 'http'; 
	projectName = config.project;
	appServer = protocol + '://' + host + ':' + port;
	apiRoot = config.apiUrl || 'api';
	packageList = config.packagesPath || 'package/list';
	files = config.files || 'package';
	uploads = config.uploads || 'package';
	architecture = config.architecture || sysInfo.arch;
	platform = config.platform || sysInfo.platform;
	osName = config.osName;
	osVersion = config.osVersion;
	version = config.version;
	build = config.releaseOnly ? 'release' : config.build;
	branch = config.branch;
	owner = config.owner;
	downloads = config.downloads || './downloads';
	installed = config.installed || './installed';
	frequency = config.frequency || 300000; // 5 minutes
	setFilters();
	setDownloadUrl();
	setUploadUrl();
	ensurePaths( downloads, installed );
}

function download( target, auth1, auth2 ) {
	var downloadTo = path.resolve( path.join( downloads, target ) );
	var options = {};
	addAuth( options, auth1, auth2 );
	return when.promise( function( resolve, reject ) {
		req.get( downloadUrl + '/' + target, options, function( err ) {
				if( err ) {
					reject( err );
				}
			}.bind ( this ) )
			.pipe( fs.createWriteStream( downloadTo ) )
			.on( 'finish', function() {
				resolve( { path: downloadTo, installPath: installed, file: target } );
			}.bind( this ) );
	} );
}

function ensurePaths( downloads, installs ) { // jshint ignore: line
	mkdirp.sync( downloads );
	mkdirp.sync( installs );
}

function getLatestVersion( ignored, auth1, auth2 ) {
	var options = {};
	addAuth( options, auth1, auth2 );
	debug( 'Checking host for packges matching %s', listUrl );
	return request( listUrl, options )
		.then( function( data ) {
			var json = JSON.parse( data[ 0 ].body ),
				list = _.reject( json, function( i ) {
					return _.contains( ignored, i.version );
				} );
			return list.length > 0 ? list[ 0 ] : undefined;
		} );
}

function setDownloadUrl() { // jshint ignore: line
	downloadUrl = appServer + '/' + files + '/' + [ projectName, owner, branch ].join( '-' );
}

function setFilters() { // jshint ignore: line
	if( build === 'release' ) {
		fileFilter = new RegExp( ( version || '[^-]*' ) + '$' );
	} else {
		fileFilter = new RegExp( [ ( version || '[^-]*' ), ( build || '.*$' ) ].join( '-' ) + '$' );
	}

	var params = [];
	params.push( 'project=' + projectName );
	params.push( 'platform=' + platform );
	params.push( 'architecture=' + architecture );
	if( owner ) {
		params.push( 'owner=' + owner );
	}
	if( branch ) {
		params.push( 'branch=' + branch );
	}
	if( osName ) {
		params.push( 'osName=' + osName );
	}
	if( osVersion ) {
		params.push( 'osVersion=' + osVersion );
	}
	if( version ) {
		params.push( 'version=' + version );
	}
	if( build ) {
		params.push( 'build=' + build );
	}
	listUrl = appServer + '/' + apiRoot + '/' + packageList + '/?' + params.join( '&' );
}

function setUploadUrl() { // jshint ignore: line
	uploadUrl = appServer + '/' + apiRoot + '/' + uploads;
}

function uploadPackage( packageInfo, auth1, auth2 ) {
	// .name, .path
	return when.promise( function( resolve, reject ) {
		var url = uploadUrl + '/' + packageInfo.name + '.tar.gz';
		var options = {};
		addAuth( options, auth1, auth2 );
		var form = req.post( url, options, function( err, resp, body ) {
			if( err ) {
				reject( err );
			} else {
				if( resp.statusCode === 200 ) {
					resolve( body );	
				} else {
					reject( new Error( body ) );
				}				
			}
		} ).form();
		form.append( packageInfo.name + '.tar.gz', fs.createReadStream( packageInfo.path ) );
	} );
}

module.exports = function( reqRef ) {
	return function( service, config ) {
		req = reqRef;
		request = nodeWhen.lift( req.get ).bind( req );
		configure( config, service || {} );
		return {
			installed: installed,
			downloads: downloads,
			download: download,
			getFileFilter: function() {
				return fileFilter;
			},
			getLatest: getLatestVersion,
			setBranch: function( newBranch ) {
				branch = newBranch;
				setFilters();
				setDownloadUrl();
			},
			setBuild: function( newBuild ) {
				build = newBuild;
				setFilters();
				setDownloadUrl();
			},
			setOwner: function( newOwner ) {
				owner = newOwner;
				setFilters();
				setDownloadUrl();
			},
			setVersion: function( newVersion ) {
				version = newVersion;
				setFilters();
				setDownloadUrl();
			},
			upload: uploadPackage
		};
	};
};