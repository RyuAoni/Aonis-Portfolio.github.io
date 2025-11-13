function initMap() {
    var location = new google.maps.LatLng({ lat: trashListInfo[0]['lat'], lng: trashListInfo[0]['lng'] });
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 18,
        center: location,
        disableDefaultUI: true,
        clickableIcons: false
    });

    var marker = [];
    var infoWindow = [];
    var currentInfoWindow = null; // 現在表示されている情報ウィンドウを保持する変数

    for (var i = 0; i < trashListInfo.length; i++) {
        var pinColor = "#2D81FF";

        var contentString =
            '<div class="container">' +

                '<div class="title">' + trashListInfo[i].name + '</div>' +
                '<div class="location">徳島県阿南市見能林町青木</div>' +
                '<div class="time">' + trashListInfo[i].time + '</div>' +

                '<div class="image-container">' +
                    '<img src="' + trashListInfo[i].imageSrc + '" alt="ゴミ箱の中身">' +
                '</div>' +

                '<div class="actions">' +
                    '<div class="action history">' +
                        '<a class="icon-button history" onClick="openModal(' + trashListInfo[i].id + ', 0)">' +
                            '<img src="../imgs/history.svg" alt="historyアイコン">' +
                            '<b>HISTORY</b>' +
                        '</a>' +
                    '</div>' +
                    '<div class="action qr" >' +
                        '<a class="icon-button qr" onClick="openModal(' + trashListInfo[i].id + ', 1)">' +
                            '<img src="../imgs/qr.svg" alt="qrアイコン">' +
                            '<b>QR</b>' +
                        '</a>' +
                    '</div>';

        if (trashListInfo[i].status === "full") {
            pinColor = "#FD3C48";
            contentString += 
                    '<div class="action full">' +
                        '<a class="icon-button full" onClick="openModal(' + trashListInfo[i].id + ', 2)">' +
                            '<img src="../imgs/FULL.svg" alt="FULLアイコン">' +
                            '<b>FULL</b>' +
                        '</a>' +
                    '</div>';
        } else if (trashListInfo[i].status === "broken") {
            pinColor = "#9C0AE1";
            contentString += 
                    '<div class="action broken">' +
                        '<a class="icon-button broken" onClick="openModal(' + trashListInfo[i].id + ', 2)">' +
                            '<img src="../imgs/BROKEN.svg" alt="brokenアイコン">' +
                            '<b>BROKEN</b>' +
                        '</a>' +
                    '</div>';
        }
        contentString += 
                '</div>' +
            '</div>';

        infoWindow[i] = new google.maps.InfoWindow({
            content: contentString
        });

        var markerLatLng = new google.maps.LatLng({ lat: trashListInfo[i]['lat'], lng: trashListInfo[i]['lng'] });

        marker[i] = new google.maps.Marker({
            position: markerLatLng,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createCustomMarkerHTML(pinColor, trashListInfo[i]['imageSrc'])),
                scaledSize: new google.maps.Size(90, 115),
                anchor: new google.maps.Point(45, 115)
            }
        });

        markerEvent(i);
    }

    function markerEvent(i) {
        marker[i].addListener('click', function () {
            if (currentInfoWindow) {
                currentInfoWindow.close();
            }
        
            var offsetCenter = new google.maps.LatLng(
                trashListInfo[i].lat + 0.0012,
                trashListInfo[i].lng
            );
            map.setCenter(offsetCenter);
        
            infoWindow[i].open(map, marker[i]);
            currentInfoWindow = infoWindow[i];
        });
    }
    map.addListener('click', function () {
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }
    });
}

function createCustomMarkerHTML(color, image) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="90" height="115">
      <foreignObject width="90" height="115">
            <div xmlns="http://www.w3.org/1999/xhtml" class="pin">
                <img src="${image}" class="image" alt="画像"></img>
            </div>
            <style>
            .image {
                width: 80%;
                height: 80%;
                object-fit: cover;
                border: 3px solid rgb(255, 255, 255);
                border-radius: 50%;
            }
            .pin {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 90px;
                height: 90px;
                border-radius: 50%;
                position: relative;
                background-color: ${color};
            }
            .pin:before {
                content: "";
                position: absolute;
                bottom: -25px;
                left: 50%;
                margin-left: -15px;
                border: 15px solid transparent;
                border-top: 15px solid ${color};
            }
            </style>
        </foreignObject>
    </svg>
    `;
}

// // テスト用：画像をBase64形式に変換する関数(効率的な方法を探す)
// function ImageToBase64(image) {
//     const img = document.getElementById('img');

//     // New Canvas
//     var canvas = document.createElement('canvas');
//     canvas.width  = img.width;
//     canvas.height = img.height;
//     // Draw Image
//     var ctx = canvas.getContext('2d');
//     ctx.drawImage(img, 0, 0);
//     // To Base64
//     return canvas.toDataURL("image/jpeg");
// }