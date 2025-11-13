// ★★★GET★★★
var markerData = [ 
  {
    name: "阿南高専情報棟内ゴミ箱",
    lat: 33.89799173259454,
    lng: 134.66788843166714,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専情報棟内ゴミ箱",
    lat: 33.8997937,
    lng: 134.6690581,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専情報棟内ゴミ箱",
    lat: 33.9003281,
    lng: 134.6675346,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専情報棟内ゴミ箱",
    lat: 33.8991704,
    lng: 134.6669123,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専内ゴミ箱",
    lat: 33.89869071057016,
    lng: 134.66741246190062,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専図書館棟内ゴミ箱",
    lat: 33.89863368980663,
    lng: 134.66868863592657,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南高専専攻科棟内ゴミ箱",
    lat: 33.89764715468003,
    lng: 134.6674689758745,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "阿南駅前",
    lat: 33.91880387941182, 
    lng: 134.66241062576543,
    title: "好きなジュースの味は",
    choice1: "ブドウ",
    choice2: "オレンジ",
    choiceColor1: "#ff0000",
    choiceColor2: "#0000ff",
  },
  {
    name: "東京駅前",
    lat: 35.681331880507976,  
    lng: 139.76711912643466,
    title: "好きな色は",
    choice1: "黒",
    choice2: "白",
    choiceColor1: "#000000",
    choiceColor2: "#ffffff",
  },
  {
    name: "東京駅周辺 ローソン",
    lat: 35.67609196548189, 
    lng:  139.7686972249582, 
    title: "好きな色は",
    choice1: "黒",
    choice2: "白",
    choiceColor1: "#000000",
    choiceColor2: "#ffffff",
  },
  {
    name: "なら100年会館",
    lat: 34.68060536379605,
    lng: 135.81682016812087,
    title: "好きな色は",
    choice1: "黒",
    choice2: "白",
    choiceColor1: "#000000",
    choiceColor2: "#ffffff",
  },
];

function initAutocomplete() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: markerData[0]['lat'], lng: markerData[0]['lng'] },
    zoom: 6,
    mapTypeId: "roadmap",
    disableDefaultUI: true,
    clickableIcons: false
  });

  let allMarkers = [];
  let currentInfoWindow = null;

  markerData.forEach(function(data) {
    // カスタムマーカーHTMLの作成
    const customMarkerHTML = createCustomMarkerHTML("#744EFF");

    // マーカーの作成
    let locationMarker = new google.maps.Marker({
      position: { lat: data.lat, lng: data.lng },
      map: map,
      title: data.name,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(customMarkerHTML),
        scaledSize: new google.maps.Size(20, 20)
      }
    });

    const contentString = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #f4f4f4; width: 100%; text-align: center; padding: 10px;">
          <h3>${data.title}</h3>
        </div>
        <div style="display: flex; width: 100%; height: 100px;">
          <div style="background-color: ${data.choiceColor1}; flex: 1; display: flex; justify-content: center; align-items: center; color: white; font-size: 20px; font-weight: bold; cursor: pointer;">
            ${data.choice1}
          </div>
          <div style="background-color: ${data.choiceColor2}; flex: 1; display: flex; justify-content: center; align-items: center; color: white; font-size: 20px; font-weight: bold; cursor: pointer;">
            ${data.choice2}
          </div>
        </div>
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({ content: contentString });

    locationMarker.addListener('click', function() {
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }
      infoWindow.open(map, locationMarker);
      currentInfoWindow = infoWindow;
    });

    allMarkers.push(locationMarker);
  });

  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });

  let searchMarkers = [];
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();
    if (places.length == 0) {
      return;
    }

    searchMarkers.forEach((marker) => {
      marker.setMap(null);
    });
    searchMarkers = [];

    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      if (!place.geometry || !place.geometry.location) {
        console.log("Returned place contains no geometry");
        return;
      }

      searchMarkers.push(
        new google.maps.Marker({
          map,
          position: place.geometry.location,
        })
      );

      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });

  map.addListener('click', function() {
    if (currentInfoWindow) {
      currentInfoWindow.close();
    }
  });
}

function createCustomMarkerHTML(color) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
    <foreignObject width="20px" height="20px">
      <div xmlns="http://www.w3.org/1999/xhtml" class="pin">
        <div style="width: 20px; height: 20px; border-radius:30px; background-color:${color}"></div>
      </div>
    </foreignObject>
  </svg>
  `;
}


const detailContainer = document.getElementById("detailContainer");

// ディティールボタンを押したらコンテンツを開く
document.addEventListener('click', (e) => {
  if (e.target.closest("#detailButton")) {
    detailContainer.style.height = 650 + 'px';
  } else {
    detailContainer.style.height = '0px';
  }
})

// データアナリティクスの円グラフを描画
// choice3が空白なら、自動でグラフが整形されます。
// ★★★GET★★★
let chartData1 = {
  title: '好きなジュースの味は？',
  choice1: 'ブドウ',
  choiceColor1: '#744EFF',
  percent1: 55,
  choice2: 'オレンジ',
  choiceColor2: '#FF8000',
  percent2: 40,
  choice3: 'キウイ',
  choiceColor3: '#039C67',
  percent3: 5,
}

let chartData2 = {
  title: '好きなジュースの味は？',
  choice1: 'バナナ',
  choiceColor1: '#744EFF',
  percent1: 10,
  choice2: 'スイカ',
  choiceColor2: '#FF8000',
  percent2: 50,
  choice3: '梨',
  choiceColor3: '#039C67',
  percent3: 40,
}

let chartData3 = {
  title: '好きなジュースの味は？',
  choice1: 'ナポリタン',
  choiceColor1: '#744EFF',
  percent1: 30,
  choice2: '餃子',
  choiceColor2: '#FF8000',
  percent2: 70,
  choice3: '',
  choiceColor3: '',
  percent3: 0,
}

doughnutchart(chartData1, 1);
doughnutchart(chartData2, 2);
doughnutchart(chartData3, 3);

function doughnutchart(chartData, index) {
  let data = {
    labels: [chartData.choice1, chartData.choice2, chartData.choice3], // ここにラベルを追加
    datasets: [{
      data: [chartData.percent1, chartData.percent2, chartData.percent3], // ここにデータを追加
      backgroundColor: [chartData.choiceColor1, chartData.choiceColor2, chartData.choiceColor3], // 色を設定
      hoverOffset: 4
    }]
  };
  // choice3が空なら、dataのlengthを整形する。
  if (chartData.choice3 == '') {
    data.labels.splice(2, 1);
    data.datasets[0].data.splice(2, 1);
    data.datasets[0].backgroundColor.splice(2, 1);
  }
  const config = {
    type: 'doughnut', // ドーナツチャートの指定
    data: data,
    options: {
      responsive: true,
      cutout: 65,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: {
              weight: '700',
              size: 13,
            }
          }
        },
        title: {
          display: true,
          text: chartData.title,
          font: {
            weight: '700',
            size: 25
          }
        },
      }
    }
  };
  const myDonutChart = new Chart(document.getElementById('myDonutChart' + index).getContext('2d'), config);
}