(function(window) {

  // De-dupe (it can happen, somehow)
  if (window['__burntable_installed']) {
    return;
  }
  window['__burntable_installed'] = true;

  function extend(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  };

  var Service = function(name, pageUrl) {
    this.name = name;
    this.pageUrl = pageUrl;
    this.floatList = true;
  };
  Service.prototype.getSongInfo = function(doc) {
    return null;
  };

  var TurnTableService = function() {
    Service.call(this, 'TurnTable', 'turntable.fm');
    this.floatList = false;
  };
  extend(TurnTableService, Service);
  TurnTableService.prototype.getSongInfo = function(doc) {
    // Full title of the song
    var title = doc.getElementsByClassName('title')[1].title;
    // Artist name + ' - NN:NN'
    var details = doc.getElementsByClassName('details')[0].children[0].innerText;
    var artist = details.substring(0, details.lastIndexOf(' - '));
    return {
      artist: artist,
      title: title
    };
  };

  var PandoraService = function() {
    Service.call(this, 'Pandora', 'pandora.com');
  };
  extend(PandoraService, Service);
  PandoraService.prototype.getSongInfo = function(doc) {
    var artist = doc.getElementsByClassName('playerBarArtist')[0].innerText;
    var title = doc.getElementsByClassName('playerBarSong')[0].innerText;
    if (!artist.length) {
      window.console.log('song info not yet available');
      return null;
    }
    return {
      artist: artist,
      title: title
    };
  };

  var GroovesharkService = function() {
    Service.call(this, 'Grooveshark', 'grooveshark.com');
  };
  extend(GroovesharkService, Service);
  GroovesharkService.prototype.getSongInfo = function(doc) {
    var el = doc.getElementById('playerDetails_nowPlaying');
    var artist = el.getElementsByClassName('artist')[0].title;
    var title = el.getElementsByClassName('currentSongLink song')[0].title;
    if (!artist.length) {
      window.console.log('song info not yet available');
      return null;
    }
    return {
      artist: artist,
      title: title
    };
  };

  var GoogleMusicService = function() {
    Service.call(this, 'Google Music', 'music.google.com');
  };
  extend(GoogleMusicService, Service);
  GoogleMusicService.prototype.getSongInfo = function(doc) {
    var artist = doc.getElementById('playerArtist').innerText;
    var title = doc.getElementById('playerSongTitle').innerText;
    return {
      artist: artist,
      title: title
    };
  };

  var services = [
    new TurnTableService(),
    new PandoraService(),
    new GroovesharkService(),
    new GoogleMusicService()
  ];

  var service;
  for (var n = 0; n < services.length; n++) {
    if (window.location.href.indexOf(services[n].pageUrl) >= 0) {
      service = services[n];
      break;
    }
  }
  if (!service) {
    alert('unknown service - bad injection?');
  }

  // Setup UI
  var list = document.createElement('div');
  list.id = 'burntable-list';
  list.style.backgroundColor = 'white';
  list.style.color = 'black';
  list.style.zIndex = 99999;
  if (service.floatList) {
    list.style.position = 'absolute';
    list.style.float = 'left';
    list.style.left = '0';
    list.style.top = '0';
    list.style.width = '400px';
    list.style.height = '300px';
    list.style.overflow = 'scroll';
  }
  document.body.appendChild(list);

  // Grabs the song info from the document (tries *really* hard)
  // Callback receives: {
  //   artist: string,
  //   title: string
  // }
  function getSongInfo(doc, callback) {
    try {
      var querySongInfo = function() {
        var songInfo = service.getSongInfo(doc);
        if (!songInfo) {
          window.setTimeout(querySongInfo, 500);
        } else {
          callback(songInfo);
        }
      };
      window.setTimeout(querySongInfo, 500);
    } catch (e) {
      window.console.log('failed to get song info:');
      window.console.log(e);
      callback(null);
    }
  };

  // Last inserted item song text, for simple de-dupe (turntable
  // has started doing weird things with urls)
  var lastSongText = '';

  // Insert a song entry into the list
  function insertSongItem(doc, request, songInfo) {
    // Construct filename/info
    var url = request.url;
    var filename = songInfo.artist + ' - ' + songInfo.title + '.mp3';

    // Add link to the list
    var a = doc.createElement('a');
    a.style.color = 'black';
    a.download = filename;
    a.href = url;

    a.innerText = songInfo.artist + ' - ' + songInfo.title;
    if (a.innerText == lastSongText) {
      return;
    }
    lastSongText = a.innerText;

    var br = doc.createElement('br');
    list.insertBefore(br, list.firstChild);
    list.insertBefore(a, list.firstChild);
  };

  // Set of all URLS - used to de-dupe
  var urlMap = {};

  // Wait for notifications from background
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    // Ensure not already in the list
    if (urlMap[request.url]) {
      window.console.log('ignoring request because already in the list: ' + request.url);
      return;
    }
    urlMap[request.url] = true;

    // Grab info
    getSongInfo(document, function(songInfo) {
      if (!songInfo) {
        window.console.log('failed to get song info');
        return;
      }

      // Post back to extension
      try {
        sendResponse(songInfo);
      } catch (e) {
        window.console.log('unable to send response');
        window.console.log(e);
        return;
      }

      // Add to list
      insertSongItem(document, request, songInfo);
    });
  });

}).call(window, window);
