var should = require( 'should' ); // jshint ignore:line
var sinon = require( 'sinon' );
var fs = require( 'fs' );
var path = require( 'path' );
var request = require( 'request' );

describe( 'when uploading with default configuration', function() {
	var success = false;
	before( function( done ) {
		var append = sinon.stub();
		var form = sinon.stub().returns( { append: append } );

		sinon.stub( request, 'post' )
			.callsArgWith( 2, null, { statusCode: 200 }, '' )
			.withArgs( 'http://localhost/api/package/empty.tar.gz', { auth: { bearer: 'faketoken' } } )
			.returns( { form: form } );

		var serverFn = require( '../src/server.js' )( request );
		var server = serverFn( { Address: 'localhost', Port: '80' }, {} );
		
		
		server.upload( { path: './spec/empty.tar.gz', name: 'empty' }, 'faketoken' )
			.then( function() {
				success = true;
				done();
			} )
			.then( null, function( err ) {
				console.log( 'failure', err.stack );
				done();
			} )
			.catch( function( err ) {
				console.log( 'failure', err.stack );
				done();
			} );
	} );

	it( 'should upload to the default upload url', function() {
		success.should.be.true; // jshint ignore:line
	} );

	after( function() {
		request.post.restore();
	} );
} );

describe( 'when uploading with custom configuration', function() {
	var success = false;
	before( function( done ) {
		var append = sinon.stub();
		var form = sinon.stub().returns( { append: append } );

		sinon.stub( request, 'post' )
			.callsArgWith( 2, null, { statusCode: 200 }, '' )
			.withArgs( 'http://hub.continua.com/_api/uploads/empty.tar.gz', { auth: { bearer: 'faketoken' } } )
			.returns( { form: form } );

		var serverFn = require( '../src/server.js' )( request );
		var server = serverFn( { Address: 'hub.continua.com', Port: '8800' }, {
			apiUrl: '_api',
			uploads: 'uploads'
		} );
		
		server.upload( { path: './spec/empty.tar.gz', name: 'empty' }, 'faketoken' )
			.then( function() {
				success = true;
				done();
			} )
			.then( null, function( err ) {
				console.log( 'failure', err.stack );
				done();
			} )
			.catch( function( err ) {
				console.log( 'failure', err.stack );
				done();
			} );
	} );

	it( 'should upload to the default upload url', function() {
		success.should.be.true; // jshint ignore:line
	} );

	after( function() {
		request.post.restore();
	} );
} );

describe( 'when getting list of packages', function() {
	var success = false;
	var latest, filteredLatest, server;

	before( function() {
		var json = JSON.stringify( [ { version: '0.2.1' }, { version: '0.2.0' }, { version: '0.1.9' } ] );
		sinon.stub( request, 'get' )
			.callsArgWith( 2, null, [ { body: json } ] )
			.withArgs( 
				'http://localhost:80/api/package/list?project=test&platform=darwin&architecture=x64&owner=arobson&branch=master&build=release', 
				{ auth: { bearer: 'faketoken' } }
			);

		var serverFn = require( '../src/server.js' )( request );
		server = serverFn( { Address: 'localhost', Port: '80' }, {
			project: 'test',
			branch: 'master',
			owner: 'arobson',
			releaseOnly: true
		} );
	} );

	describe( 'without ignore filter', function() {
		before( function( done ) {
			server.getLatest( [], 'faketoken' )
				.then( function( result ) {
					success = true;
					latest = result;
					done();
				} )
				.then( null, function( err ) {
					console.log( 'failure', err.stack );
					done();
				} )
				.catch( function( err ) {
					console.log( 'failure', err.stack );
					done();
				} );
		} );

		it( 'should result in expected version', function() {
			latest.should.eql( { version: '0.2.1' } );
		} );
	} );

	describe( 'with ignored version', function() {
		before( function( done ) {
			server.getLatest( [ '0.2.1' ], 'faketoken' )
				.then( function( result ) {
					success = true;
					filteredLatest = result;
					done();
				} )
				.then( null, function( err ) {
					console.log( 'failure', err.stack );
					done();
				} )
				.catch( function( err ) {
					console.log( 'failure', err.stack );
					done();
				} );
		} );

		it( 'should result in expected version', function() {
			filteredLatest.should.eql( { version: '0.2.0' } );
		} );
	} );

	after( function() {
		request.get.restore();
	} );
} );

describe( 'when downloading a package', function() {
	var info;
	before( function( done ) {
		var on = sinon.stub()
			.callsArg( 1 );
		var pipe = sinon.stub()
			.returns( { on: on } );

		sinon.stub( request, 'get' )
			.callsArgWith( 2, null, [ { body: 'this is just for testing' } ] )
			.withArgs( 
				'http://localhost:80/package/test-arobson-master/example.tar.gz', 
				{ auth: { bearer: 'faketoken' } }
			).returns( { pipe: pipe } );

		var serverFn = require( '../src/server.js' )( request );
		var server = serverFn( { Address: 'localhost', Port: '80' }, {
			project: 'test',
			branch: 'master',
			owner: 'arobson',
			releaseOnly: true
		} );

		server.download( 'example.tar.gz', 'faketoken' )
			.then( function( result ) {
				info = result;
				done();
			} );
	} );

	it( 'should create file', function() {
		fs.existsSync( './downloads/example.tar.gz' ).should.be.true; // jshint ignore:line
		info.should.eql( { path: path.resolve( './downloads/example.tar.gz' ), installPath: './installed', file: 'example.tar.gz' } );
	} );

	after( function() {
		request.get.restore();
		fs.unlinkSync( './downloads/example.tar.gz' );
	} );
} );