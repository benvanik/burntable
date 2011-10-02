// Only allow one list per tab
if (!document.getElementById('burntable-list')) {
  // List
  var list = document.createElement('div');
  list.id = 'burntable-list';
  list.style.zIndex = 99999;
  list.style.position = 'absolute';
  list.style.float = 'left';
  list.style.backgroundColor = 'white';
  list.style.left = '0';
  list.style.top = '0';
  document.body.appendChild(list);

  // Set of all URLS - used to de-dupe
  var urlMap = {};

  // Attempts to extract the song info from the document
  function getSongInfo(doc, callback) {
    try {
      if (window.location.href.indexOf('pandora.com') >= 0) {
        var queryPandoraInfo = function queryPandoraInfo() {
          var artist = doc.getElementsByClassName('playerBarArtist')[0].innerText;
          var title = doc.getElementsByClassName('playerBarSong')[0].innerText;
          if (!artist.length) {
            window.console.log('song info not yet available');
            window.setTimeout(queryPandoraInfo, 500);
          }
          callback({
            artist: artist,
            title: title
          });
        }
        window.setTimeout(queryPandoraInfo, 500);
      } else if (window.location.href.indexOf('grooveshark.com') >= 0) {
        var queryGroovesharkInfo = function queryGroovesharkInfo() {
          var el = doc.getElementById('playerDetails_nowPlaying');
          var artist = el.getElementsByClassName('artist')[0].title;
          var title = el.getElementsByClassName('currentSongLink song')[0].title;
          if (!artist.length) {
            window.console.log('song info not yet available');
            window.setTimeout(queryGroovesharkInfo, 500);
          }
          callback({
            artist: artist,
            title: title
          });
        }
        window.setTimeout(queryGroovesharkInfo, 500);
      } else if (window.location.href.indexOf('music.google.com') >= 0) {
        var artist = doc.getElementById('playerArtist').innerText;
        var title = doc.getElementById('playerSongTitle').innerText;
        callback({
          artist: artist,
          title: title
        });
      } else {
        // Full title of the song
        var title = doc.getElementsByClassName('title')[1].title;
        // Artist name + ' - NN:NN'
        var details = doc.getElementsByClassName('details')[0].children[0].innerText;
        var artist = details.substring(0, details.lastIndexOf(' - '));
        callback({
          artist: artist,
          title: title
        });
      }
    } catch (e) {
      window.console.log('failed to get song info:');
      window.console.log(e);
      callback(null);
    }
  }

  // Wait for notifications from background
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    // Ensure not already in the list
    if (urlMap[request.url]) {
      console.log('ignoring request because already in the list: ' + request.url);
      return;
    }
    urlMap[request.url] = true;

    // Grab info
    getSongInfo(document, function(songInfo) {
      if (!songInfo) {
        console.log('failed!');
        return;
      }

      // Post back to extension
      try {
        sendResponse(songInfo);
      } catch (e) {
        console.log('unable to send response');
        console.log(e);
        return;
      }

      // Construct filename/info
      var url = request.url;
      var filename = songInfo.artist + ' - ' + songInfo.title + '.mp3';

      // Add link to the list
      var a = document.createElement('a');
      a.download = filename;
      a.href = url;
      a.innerText = songInfo.artist + ' - ' + songInfo.title;
      a.style.color = 'black';
      var br = document.createElement('br');
      list.insertBefore(br, list.firstChild);
      list.insertBefore(a, list.firstChild);
    });
  });
}
