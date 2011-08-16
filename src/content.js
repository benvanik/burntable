// Only allow one list per tab
if (!document.getElementById('burntable-list')) {
  // List
  var list = document.createElement('div');
  list.id = 'burntable-list';
  document.body.appendChild(list);

  // Attempts to extract the song info from the document
  function getSongInfo(doc) {
    // Full title of the song
    var title = doc.getElementsByClassName('title')[1].title;
    // Artist name + ' - NN:NN'
    var details = doc.getElementsByClassName('details')[0].children[0].innerText;
    var artist = details.substring(0, details.lastIndexOf(' - '));
    return {
      artist: artist,
      title: title
    };
  }

  // Wait for notifications from background
  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    // Grab info
    var songInfo;
    try {
      songInfo = getSongInfo(document);
    } catch (e) {
      console.log('unable to parse song info');
      console.log(e);
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
    var br = document.createElement('br');
    list.insertBefore(br, list.firstChild);
    list.insertBefore(a, list.firstChild);
  });
}
