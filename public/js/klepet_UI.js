function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}


function divElementSlika(urlSlike) {
  return $('<img src="' + urlSlike + '"/>').addClass("slika");
}

function poisciSlike(sporocilo) {
  //console.log("nekaj je najdlo");
  var jeSlika = new RegExp('((http|https):\\/\\/[^ "]+(\\.jpg|\\.gif|\\.png)\\b)', 'gi');
  if(jeSlika.test(sporocilo)) {
    var arraySlik = sporocilo.match(jeSlika);
    //console.log("nekaj je najdlo");
    return arraySlik;
  }
}

function prikaziSlike(arraySlik) {
  for(var i = 0; i < arraySlik.length; i++) {
    //console.log(arraySlik[i]);
    $('#sporocila').append(divElementSlika(arraySlik[i]));
  }
}

function iframeElementVideo(video) {
  console.log("https://www.youtube.com/embed/" + video);
  return $('<iframe src="https://www.youtube.com/embed/' + video + '" allowfullscreen height="150" width="200" style="margin-left: 20px;></iframe>');
}

function najdiVideo(sporocilo) {
  var regex = new RegExp('https:\\/\\/www\\.youtube\\.com\\/watch\\?v=([^ "]+)', 'gi');
  var videos = [];
  var match = regex.exec(sporocilo);
  while(match != null){
    videos.push(match[1]);
    match = regex.exec(sporocilo);
  }
  return videos;
}

function prikaziVideo (videos) {
  for(var i = 0; i < videos.length; i++) {
    console.log("https://www.youtube.com/embed/" + videos[i] + " to bi moglo priakzat");
    $('#sporocila').append($('<iframe src="https://www.youtube.com/embed/' + videos[i] + '" allowfullscreen ></iframe>').addClass("video")); //height="150" width="200" style="margin-left: 20px
    //$('#sporocila').append(iframeElementVideo(videos[i])); 
  }
}




function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  var slike = poisciSlike(sporocilo);
  sporocilo = filtirirajVulgarneBesede(sporocilo);
  prikaziSporocilo = dodajSmeske(sporocilo);

  var videos = najdiVideo(sporocilo);
  sporocilo = dodajSmeske(sporocilo);

  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);

    $('#sporocila').append(divElementEnostavniTekst(prikaziSporocilo));
    if(slike != null) prikaziSlike(slike);
    prikaziVideo(videos);

    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}
  
var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);
  $('#vsebina').jrumble();

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('dregljaj', function() {
      
      $('#vsebina').trigger('startRumble');
      setTimeout(function(){ $('#vsebina').trigger('stopRumble'); }, 1500);
       
  })
  
  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {

    var novElement = divElementEnostavniTekst(dodajSmeske(sporocilo.besedilo));
    var slike = poisciSlike(sporocilo.besedilo);
    var videos = najdiVideo(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    if(slike != null) prikaziSlike(slike);
    prikaziVideo(videos);
    
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
        $('#poslji-sporocilo').val("/zasebno \"" + $(this).text() + "\" ");
        $('#poslji-sporocilo').focus();
    });
    
    $('#seznam-uporabnikov div').click(function() {
        $('#poslji-sporocilo').val("/zasebno \"" + $(this).text() + "\" ");
        $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}