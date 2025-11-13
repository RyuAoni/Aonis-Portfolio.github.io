// const BACKENDURL = "../php/get_bin.php";
// const BACKENDURLtwo = "../php/get_bin_two.php";
// const BACKENDURLthree = "../php/solve.php";


const BACKENDURL_BASE = "../php/";
//☆仮バックエンドサーバーを指定☆
//const BACKENDURL_BASE = "http://localhost:3000/";


const BACKENDURL = BACKENDURL_BASE + "get_bin.php";
const BACKENDURLtwo = BACKENDURL_BASE + "get_bin_two.php";
const BACKENDURLthree = BACKENDURL_BASE + "solve.php";
const BACKENDURLfore = BACKENDURL_BASE + "add_bin.php";

//☆仮バックエンドサーバーを指定☆
// const BACKENDURL_BASE = "http://localhost:3000/";
// ★★★ GETする ★★★
// 現在のURLからクエリパラメータを取得
const params = new URLSearchParams(window.location.search);

// bin_idというクエリパラメータの値を取得
const user_id = params.get('user_id');
console.log(user_id);

let getData = BACKENDURL + "?user_id=" + user_id;
console.log(getData);

let choices = [];
let bin = [];
getVotes();

async function getVotes() {
	try {
		
		const response = await fetch(getData);
		console.log("getData = " + getData);
        //console.log("response = " + await response.text());
		let datas = await response.json();
		console.log(datas);
		bin = datas["bin"];
		console.log("bin=" + bin);
        onFetchBin(await bin);
	} catch (error) {
        console.error('Error fetching votes:', error);
	}
}

let trashListInfo = [];

async function onFetchBin(binPromise){
 
    // 選択肢の情報を配列で定義
    const bin = await binPromise;

    trashListInfo = bin.map(item => ({
        id: item.id,
        name: item.name,
        time: item.time,
        place: item.place,
        imageSrc: item.imageSrc, // Keeping the hardcoded image source
        status: item.status,
        lat: item.lat,
        lng: item.lng,
    }));

    // 選択肢を繰り返し生成して配置
    const trashList = document.getElementById("trashList");
    trashListInfo.forEach((trash) => {
        const trashItem = document.createElement("div");
        trashItem.className = "trash-item";

        // ゴミ箱の情報をlistに追加
        let html = `
            <div class="left-info">
                <div class="trash-info">
                    <p class="trash-name">${trash.name}</p>
                    <p class="trash-time">${trash.place}</p>
                    <p class="trash-num">更新日時：${trash.time}</p>
                </div>
                <div class="trash-status"> 
                    <div class="action history">
                        <a class="icon-button history" onClick='openModal(${trash.id}, 0)'>
                            <img src="../imgs/history.svg" alt="historyアイコン">
                            <b>HISTORY</b>
                        </a>
                    </div>
                    <div class="action qr">
                        <a class="icon-button qr" onClick='openModal(${trash.id}, 1)'>
                            <img src="../imgs/qr.svg" alt="qrアイコン">
                            <b>QR</b>
                        </a>
                    </div>`
        if (trash.status == "full") {
            html += `
                    <div class="action full">
                        <a class="icon-button full" onClick='openModal(${trash.id}, 2)'>
                            <img src="../imgs/FULL.svg" alt="FULLアイコン">
                            <b>FULL</b>
                        </a>
                    </div>`;
        } else if (trash.status == "broken") {
            html += `
                    <div class="action broken">
                        <a class="icon-button broken" onClick='openModal(${trash.id}, 2)'>
                            <img src="../imgs/BROKEN.svg" alt="BROKENアイコン">
                            <b>BROK</b>
                        </a>
                    </div>`;
        } else {
            html += `
                    <div class="action">
                        <a class="icon-button">
                            <img>
                            <b></b>
                        </a>
                    </div>`;
        }
        html += `
                </div>
            </div>
            <img src="${trash.imageSrc}" alt="ゴミ箱画像" class="trash-image">
        `;

        trashItem.innerHTML = html;
        trashList.appendChild(trashItem);
    });

}

function openModal(id, kinds) {
    console.log("openModal{id="+id+" kindsf=" + kinds + "}");
    switch(kinds) {
        // HISTORYボタン
        case 0:
            console.log("HISTORY" + id);
            makeHistoryModal(id);
            break;
        // QRボタン
        case 1:
            console.log("QR" + id);
            makeQRModal(id);
            break;
        // FULLボタン、BROKENボタン
        case 2:
            console.log("FULL,BROKEN" + id);
            makeStatusModal(id);
            break;
        case 3:
            console.log("new gomibako");
            document.getElementById("myModal").style.display="block";
            break;
    }
}

async function makeHistoryModal(id) {
    console.log("POSTをid="+id+"で投げます");
    let data = {};
    // ★★★idをPOSTしてHISTORYを取得する★★★
    try {
        const response = await fetch(BACKENDURLtwo, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bin_id: id })
        });
        //console.log(await response.text());
        data = await response.json();
        console.log(data);
        		// console.log("choices=" + choices);
		// choices.forEach(choice => {
		// 	const choicePercentDiv = document.getElementById("choice-percent" + choice.id);
		// });

    } catch (error) {
        console.error('Error submitting vote:', error);
    }
    
    histories = data["bin"].map(item =>({
        time: item.time,
        image:item.image,
    }));

    console.log("history_data=%o",await histories);


    const modal = document.getElementById("HisModal");
    const container = document.getElementById("gridContainer");

    // 過去のgrid-itemを全て削除する
    container.innerHTML = "";

    histories.forEach((history) => {
        const item = document.createElement("div");
        item.className = "grid-item";

        const image = document.createElement("img");
        image.src = history.image;

        const time = document.createElement("p");
        time.textContent = history.time;
        
        item.appendChild(image);
        item.appendChild(time);
        container.appendChild(item);
    });
    modal.style.display = "block";
}

function makeQRModal(id) {
    // POSTする必要なし。idをQRコードAPIに渡して制作している。
    const url = "https://202.231.44.30/pages_user/vote.html?bin_id=" + id;
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    const qr = new QRCode( qrContainer, {
        text: url,
        width: 200,
        height: 200,
    });
    const modal = document.getElementById("QRModal");
    modal.style.display = "block";
}

function makeStatusModal(id) {
    // idごとに振られたパスワード
    let password = "aze";

    // モーダルを表示
    const modal = document.getElementById("StatusModal");
    modal.style.display = "block";

    // パスワード入力欄を取得
    const input = modal.getElementsByTagName('input')[0];
    // 入力欄を空白に初期化
    input.value = "";

    // 解決しましたボタンを取得
    const solveButton = input.parentNode.nextElementSibling;

    // パスワードが入力された時の処理
    input.addEventListener("input", function() {
        if (input.value.trim() == password) {
            solveButton.style.backgroundColor = "#0F6A34";
            solveButton.disabled = false;
        } else {
            solveButton.style.backgroundColor = "";
            solveButton.disabled = true;
        }
    });

    // パスワードを突破したときの処理
    solveButton.addEventListener("click", async function() {
        // ★★★POST★★★
        // idをPOSTして、fullやbrokenを空白にする
        try {
            const response = await fetch(BACKENDURLthree, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bin_id: id })
            });
            console.log("test");
            //console.log(await response.text());
            const data = await response.json();
            choices= data["bin"];
            console.log("data=%o",data);
            console.log("choices=" + choices);
            //choices.forEach(choice => {
                //const choicePercentDiv = document.getElementById("choice-percent" + choice.id);
            //});
    
        } catch (error) {
            console.error('Error submitting vote:', error);
        }
        //document.getElementById('solve-form').addEventListener('submit', function(event) {
            //event.preventDefault(); // フォームのデフォルトの送信を防ぐ

            //const formData = new FormData(this); // フォームデータを取得

            //fetch('../php/solve.php', { //ここにphpファイルの場所
                //method: 'POST',
                //body: formData
            //})
            //.then(response => response.json())
            //.then(data => {
                //console.log(data);
                //if (data.error) {
                    //alert(data.error); // エラーがあれば表示
                //} else {
                    //alert('ゴミ箱の状態を異常なしにしました！');
                //}
            //})
            //.catch(error => {
                //console.error('Error:', error);
            //});
        //});
        // ★★★GETしてリストを更新★★★
        getVotes();
    });
}

// 戻るボタンの処理
function backPage(obj) {
    obj.parentNode.parentNode.style.display = "none";
}

// QRコードのダウンロード
document.getElementById("downloadBtn").addEventListener("click", function() {
    const canvas = document.querySelector("#qrcode canvas");

    // 新しいキャンバスを作成して余白を追加
    const newCanvas = document.createElement("canvas");
    const context = newCanvas.getContext("2d");

    const padding = 20; // 余白のサイズ（ピクセル）
    newCanvas.width = canvas.width + padding * 2;
    newCanvas.height = canvas.height + padding * 2;

    // 背景を白に設定
    context.fillStyle = "white";
    context.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // 元のQRコードを新しいキャンバスに描画
    context.drawImage(canvas, padding, padding);

    // 新しいキャンバスをデータURLに変換
    const dataURL = newCanvas.toDataURL("image/png");

    // データURLをBlobに変換
    function dataURLToBlob(dataURL) {
        const binary = atob(dataURL.split(',')[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: 'image/png' });
    }

    const blob = dataURLToBlob(dataURL);

    // ファイルをダウンロード
    saveAs(blob, "qrcode_with_padding.png"); // ファイル名を指定
});

// Google Mapsの初期化
let map;
let marker;
let geocoder;
let selectedCoordinates = { lat: null, lng: null };
const mapContainer = document.getElementById("mapModalMap");

function initMapModal() {
    map = new google.maps.Map(mapContainer , {
        center: { lat: 35.6895, lng: 139.6917 }, // 初期位置を東京に設定
        disableDefaultUI: true,
        clickableIcons: false,
        zoom: 8,
    });

    map.addListener("click", function (e) {
        placeMarkerAndPanTo(e.latLng, map);
        getAddressFromLatLng(e.latLng);
    });

    // search()
}

// マーカーを配置し、クリックした位置にピンを指す
function placeMarkerAndPanTo(latLng, map) {
    if (marker) {
        marker.setPosition(latLng);
    } else {
        marker = new google.maps.Marker({
            position: latLng,
            map: map,
        });
    }
    map.panTo(latLng);
    selectedCoordinates = { lat: latLng.lat(), lng: latLng.lng() };
}

function getAddressFromLatLng(latLng) {
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, function (results, status) {
        if (status === "OK" && results[0]) {
            document.getElementById('location-name').innerHTML = results[0].formatted_address;
        } else {
            console.error("住所の取得に失敗しました。");
        }
    });
}

function search() {
    // 検索ボックスの設定
  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);

  // 検索ボックス結果を現在のマップ領域にバイアス
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });

  let searchMarkers = [];

  // 検索結果が選択されたとき
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // 古いマーカーを削除
    searchMarkers.forEach((marker) => {
      marker.setMap(null);
    });
    searchMarkers = [];

    // 各プレイスについてマーカーを作成
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
}

// 位置情報選択ボタンがクリックされたときにGoogle Mapsモーダルを表示する
document.querySelector('.location-btn').addEventListener('click', function() {
    initMapModal(); // モーダル表示時にGoogle Mapsを初期化
    mapModal.style.display = "block"; // Google Mapsモーダルを表示
});

// 位置情報確定ボタンの処理
submitLocationBtn.onclick = function() {
    mapModal.style.display = "none"; // Google Mapsモーダルを閉じる
    mapContainer.innerHTML = "";
}

// ファイルが選択されたときの処理
document.getElementById('file-upload').addEventListener('change', function(event) {
    const fileName = event.target.files[0].name;
    document.getElementById('file-name').textContent = fileName;
});

// 「新しくゴミ箱を追加する」の入力が全部揃ったときの処理
document.addEventListener("DOMContentLoaded", function() {
    const submitButton = document.querySelector(".submit-btn");
    const inputField = document.querySelector(".input-field-trash input");
    const fileInput = document.getElementById("file-upload");
    const locationInfo = document.getElementById("location-name");
    const locationButton = document.getElementById("submitLocationBtn");

    // 入力フィールドとファイル選択が有効な場合にボタンを有効にする
    function enableSubmitButton() {
        const isInputValid = inputField.value.trim() !== "";
        const isFileSelected = fileInput.files.length > 0;
        const isLocationSelected = locationInfo.innerHTML !== "";
        if(isInputValid && isFileSelected && isLocationSelected) {
            submitButton.style.backgroundColor = "#0F6A34";
            submitButton.disabled = false;
        } else {
            submitButton.style.backgroundColor = "gray";
            submitButton.disabled = true;
        }
    }

    // 入力フィールドまたはファイル選択が変更されたときにボタンをチェック
    inputField.addEventListener("input", enableSubmitButton);
    fileInput.addEventListener("change", enableSubmitButton);
    locationButton.addEventListener("click", enableSubmitButton);
    submitButton.addEventListener("click", function() {
        //★★★POST★★★
//        submitVote();
    })
});

//async function submitVote(name, adress, lat, lon, photo) {
//	console.log(name);
//	console.log(adress);
//	console.log(lat);
//	console.log(lon);
//    try {
//		console.log("a");
//		const payload = {
//			user_id: user_id,
//			bin_name: name,
//			bin_adress: adress,
//			adress_latitude: lat,
//			adress_longitude: lon,
//			bin_photo: photo
//		};
//		console.log("b");

//    	const response = await fetch(BACKENDURLfore, {
//        	method: 'POST',
//        	headers: {
//	        	'Content-Type': 'application/json'
//        	},
//        	body: JSON.stringify(payload)
//    	});
//		console.log("d");

//    	const data = await response.json();
//		console.log("e");
//		console.log(data);
		/*
		data.forEach(item => {
			console.log(item); // forEachを実行
		});
		*/
		console.log("c");
//		console.log(response); // サーバーからのレスポンス全体を確認
//		console.log(response.data); // dataプロパティの確認

//		if (response.ok) {
//			updateVotePercentages(data.choices);
//		} else {
//			console.error('Vote submission failed:', data.message);
//		}

		//choices=data["choices"];
//		console.log(data)

//    } catch (error) {
//        console.error('Error submitting vote:', error);
//	}
//}

// マップモードとリストモードの切り替え
const toggleButtonList = document.getElementById("toggle-button-list");
const toggleButtonMap = document.getElementById("toggle-button-map");
const mapmode = document.getElementById("map");
toggleButtonList.addEventListener("click", function() {
    toggleButtonList.style.backgroundColor = "#0F6A34";
    toggleButtonList.style.color = "#ffffff";
    toggleButtonMap.style.backgroundColor = "transparent";
    toggleButtonMap.style.color = "#0F6A34";
    trashList.style.display = "block";
    mapmode.style.display = "none";
});
toggleButtonMap.addEventListener("click", function() {
    toggleButtonList.style.backgroundColor = "transparent";
    toggleButtonList.style.color = "#0F6A34";
    toggleButtonMap.style.backgroundColor = "#0F6A34";
    toggleButtonMap.style.color = "#ffffff";
    trashList.style.display = "none";
    mapmode.style.display = "block";
})