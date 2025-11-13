const BACKENDURL_BASE = "../php/";

const BACKENDURL_SET = BACKENDURL_BASE + "Box.php";
const BACKENDURL_NEW = BACKENDURL_BASE + "CustamQuestion.php";
const BACKENDURL_SHOW = BACKENDURL_BASE + "ShowAncSponsor.php";

const user_id = params.get('user_id');
console.log(user_id);

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
    const customMarkerHTML = createCustomMarkerHTML("#FF4BBD");

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


const toggleButtonEditVote = document.getElementById("toggle-button-editvote");
const toggleButtonEditLogo = document.getElementById("toggle-button-editlogo");
const toggleButtonData = document.getElementById("toggle-button-data");
const detailContainer = document.getElementById("detailContainer");
const detailContainerEditVote = document.getElementById("detailContainerEditVote");
const detailContainerEditLogo = document.getElementById("detailContainerEditLogo");
const detailContainerData = document.getElementById("detailContainerData");
const mapmode = document.getElementById("map");

// マップモードとリストモードの切り替え
toggleButtonEditVote.addEventListener("click", function() {
  toggleButtonEditVote.style.backgroundColor = "#FF4BBD";
  toggleButtonEditVote.style.color = "#ffffff";
  toggleButtonEditLogo.style.backgroundColor = "transparent";
  toggleButtonEditLogo.style.color = "#FF4BBD";
  toggleButtonData.style.backgroundColor = "transparent";
  toggleButtonData.style.color = "#FF4BBD";
  detailContainerEditVote.style.display = "flex";
  detailContainerEditLogo.style.display = "none";
  detailContainerData.style.display = "none";
});
toggleButtonEditLogo.addEventListener("click", function() {
  toggleButtonEditVote.style.backgroundColor = "transparent";
  toggleButtonEditVote.style.color = "#FF4BBD";
  toggleButtonEditLogo.style.backgroundColor = "#FF4BBD";
  toggleButtonEditLogo.style.color = "#ffffff";
  toggleButtonData.style.backgroundColor = "transparent";
  toggleButtonData.style.color = "#FF4BBD";
  detailContainerEditVote.style.display = "none";
  detailContainerEditLogo.style.display = "flex";
  detailContainerData.style.display = "none";
});
toggleButtonData.addEventListener("click", function() {
  toggleButtonEditVote.style.backgroundColor = "transparent";
  toggleButtonEditVote.style.color = "#FF4BBD";
  toggleButtonEditLogo.style.backgroundColor = "transparent";
  toggleButtonEditLogo.style.color = "#FF4BBD";
  toggleButtonData.style.backgroundColor = "#FF4BBD";
  toggleButtonData.style.color = "#ffffff";
  detailContainerEditVote.style.display = "none";
  detailContainerEditLogo.style.display = "none";
  detailContainerData.style.display = "flex";
});

// ディティールボタンを押したらコンテンツを開く
document.addEventListener('click', (e) => {
  if (e.target.closest("#detailButton")) {
    detailContainer.style.height = 650 + 'px';
  } else if (e.target.closest('.delete')) {
    detailContainer.style.height = 650 + 'px';
  } else {
    detailContainer.style.height = '0px';
  }
})

document.addEventListener('DOMContentLoaded', (event) => {
  const addChoiceButton = document.getElementById('add-choice');
  const setButton = document.getElementById('set-button');
  const detailContainerEditVote = document.getElementById('detailContainerEditVote');
  let choiceCount = detailContainerEditVote.querySelectorAll('.choice').length;

  function updateButtons() {
    const choices = detailContainerEditVote.querySelectorAll('.input-field-trash');
    const inputsFilled = [...choices].every(choice => choice.querySelector('input').value.trim() !== '');
    setButton.disabled = !inputsFilled;
    addChoiceButton.disabled = choiceCount >= 3;
  }

  function addChoice() {
    if (choiceCount < 3) {
      const choiceDiv = document.createElement('div');
      choiceDiv.classList.add('choice');
      choiceDiv.innerHTML = `
          <div class="input-name">
              <span>選択肢</span>
              <input type="color" value="#12790a">
              <img class="delete" src="../imgs/delete.svg">
          </div>
          <div class="input-field-trash">
              <input type="text">
          </div>
      `;
      detailContainerEditVote.insertBefore(choiceDiv, addChoiceButton);
      choiceCount++;
      updateButtons();
    }
  }

  function deleteChoice(event) {
    if (choiceCount > 2) {
      const choiceDiv = event.target.closest('.choice');
      detailContainerEditVote.removeChild(choiceDiv);
      choiceCount--;
      updateButtons();
    }
  }

  addChoiceButton.addEventListener('click', addChoice);
  detailContainerEditVote.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete')) {
      deleteChoice(event);
    }
  });
  detailContainerEditVote.addEventListener('input', updateButtons);
  updateButtons();

  // 全てのinput要素を配列にまとめる
  function gatherInputs() {
    const title = document.getElementById('title-input').value;
    const choices = detailContainerEditVote.querySelectorAll('.choice');
    const choiceArray = Array.from(choices).map(choice => ({
      choice: choice.querySelector('input[type="text"]').value,
      color: choice.querySelector('input[type="color"]').value
    }));
    return JSON.stringify({ title, choices: choiceArray });
  }

  // Example usage
  setButton.addEventListener('click', () => {
      const allInputs = gatherInputs();
      // ★★★POST★★★
      console.log(allInputs); // コンソールに全ての入力値を表示
  });
});

// データアナリティクスの円グラフを描画
// choice3が空白なら、自動でグラフが整形されます。
// ★★★GET★★★
let chartData = {
  title: '好きなジュースの味は？',
  choice1: 'ブドウ',
  choiceColor1: '#744EFF',
  percent1: 30,
  choice2: 'オレンジ',
  choiceColor2: '#FF8000',
  percent2: 40,
  choice3: 'キウイ',
  choiceColor3: '#039C67',
  percent3: 5,
}

let graph = 'null';

const dataSelect = document.getElementById('data-select');
dataSelect.addEventListener('change', (event) => {
  switch (event.target.value) {
    case 'data1':
      // 等倍のデータ
      graph = 2;
      alert("data1");
      break;
    case 'data2':
      // ２倍のデータ
      graph = 1;
      alert("data2");
      break;
  }
})

//console.log("POSTをid="+id+"で投げます");
//    let graph_data = {};
//    try {
//      const payload = {
//        bin_id: bin_id,
//        filter_number: graph
//      };
//        const response = await fetch(BACKENDURL_SHOW, {
//            method: 'POST',
//            headers: {
//                'Content-Type': 'application/json'
//            },
//            body: JSON.stringify(payload)
//        });
        //console.log(await response.text());
//        graph_data = await response.json();
//        console.log(graph_data);

//    } catch (error) {
//        console.error('Error submitting vote:', error);
//    }
    
//    chartData = graph_data["bin"].map(item =>({
//        time: item.time,
//        image:item.image,
//          title: item.question,
//          choice1: 'ブドウ',
//          choiceColor1: '#744EFF',
//          percent1: 30,
//          choice2: 'オレンジ',
//          choiceColor2: '#FF8000',
//          percent2: 40,
//          choice3: 'キウイ',
//          choiceColor3: '#039C67',
//          percent3: 5,
//    }));

//    console.log("graph_data=%o",await histories);



const ctx = document.getElementById('myDonutChart').getContext('2d');
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

const myDonutChart = new Chart(ctx, config);


document.getElementById('file-upload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const fileName = document.getElementById('file-name');
  const previewContainer = document.getElementById('preview-container');

  // ファイル名を表示
  fileName.textContent = file.name;

  // 既存のプレビュー画像を削除
  previewContainer.innerHTML = '';

  // 新しい画像のプレビューを表示
  const reader = new FileReader();
  reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-img';
      previewContainer.appendChild(img);
  };
  reader.readAsDataURL(file);
});

document.getElementById('setting-logo').addEventListener('click', function() {
  alert("ロゴが変更されました");
});