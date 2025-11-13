const BACKENDURL = "../php/ShowAncUser.php";
const BACKENDURLtwo = "../php/status_and_vote.php";

// 各Canvasの横幅、縦幅（canvasFront:投げる画面、canvasBack：落ちる画面）
const elementFront = document.getElementById("canvasFront")
const elementBack = document.getElementById("canvasBack")
const WIDTH =  elementFront.clientWidth;
const HEIGHT_FRONT = elementFront.clientHeight;
const HEIGHT_BACK = elementBack.clientHeight;

// 投票する物体を定義
let item;
// 投票する物体の半径を定義
const itemRadius = document.getElementById('voteBall').naturalWidth/2;
// 投票する物体の画像ID（1:通常、2:2倍）
let itemKinds = 1;
// 投票結果
let itemResult;
let nbc = "";

// モジュール各種(Matter.を省略するため)
const Engine     = Matter.Engine;
const Render     = Matter.Render;
const Runner     = Matter.Runner;
const Body       = Matter.Body;
const Bodies     = Matter.Bodies;
const Bounds     = Matter.Bounds;
const Common     = Matter.Common;
const Composite  = Matter.Composite;
const Composites = Matter.Composites;
const Constraint = Matter.Constraint;
const Events     = Matter.Events;
const Mouse      = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;

//写真用
let base64Image = "empty";
let newFileName = "noname";

// 現在のURLからクエリパラメータを取得
const params = new URLSearchParams(window.location.search);

// bin_idというクエリパラメータの値を取得
const bin_id = params.get('bin_id');

let getData = BACKENDURL + "?bin_id=" + bin_id;

let choices = [];

getVotes();

async function getVotes() {
	try {
		
		const response = await fetch(getData);
		console.log(getData);
		datas = await response.json();
		console.log(datas);
		choices = datas["choices"];
		console.log(choices)		
	  // 選択肢を繰り返し生成して配置
		const choicesContainer = document.getElementById("choices");
		choices.forEach((choice) => {
			const choiceDiv = document.createElement("div");
			choiceDiv.className = "choice";
			choiceDiv.style.backgroundColor = choice.color;

			const choiceNameDiv = document.createElement("div");
			choiceNameDiv.className = "choice-name";
			choiceNameDiv.textContent = choice.name;

			const choicePercentDiv = document.createElement("div");
			choicePercentDiv.className = "choice-percent";
			choicePercentDiv.textContent = choice.percent + "%";
			//後で書き換えるのでidを付与する。他のも別にしていいけどさぼる
			choicePercentDiv.id = "choice-percent" + choice.id;

			const guideArrowImg = document.createElement("img");
			guideArrowImg.className = "guideArrow";
			guideArrowImg.src = "./guideArrow.svg";

			choiceDiv.appendChild(choiceNameDiv);
			choiceDiv.appendChild(choicePercentDiv);
			choiceDiv.appendChild(guideArrowImg);

			choicesContainer.appendChild(choiceDiv);
		});
		
				// 投票タイトルを埋め込む
		document.getElementById('title').innerText = datas["question"];

		//console.log(total);

		// 選択肢がABしかない場合、indexが2番目のCを削除する
		if (choices.length != 3) { choices.splice(2, 1); }
		engine()

	} catch (error) {
	  console.error('Error fetching votes:', error);
	}
}



// 選択肢の情報を配列で定義
async function submitVote(choice, kind, situation, fimage, filename) {
	console.log(choice);
	console.log(kind);
	console.log(situation);
	console.log(filename);
    try {
		console.log("a");
		const payload = {
			bin_id: bin_id,
			vote_id: choice,
			vote_dis: kind,
			bin_situation: situation,
			photo_url: filename,
			photo: fimage
		};
		console.log("b");

    	const response = await fetch(BACKENDURLtwo, {
        	method: 'POST',
        	headers: {
	        	'Content-Type': 'application/json'
        	},
        	body: JSON.stringify(payload)
    	});
		console.log("d");

    	const data = await response.json();
		console.log("e");
		console.log(data);
		/*
		data.forEach(item => {
			console.log(item); // forEachを実行
		});
		*/
		console.log("c");
		console.log(response); // サーバーからのレスポンス全体を確認
		console.log(response.data); // dataプロパティの確認

		if (response.ok) {
			updateVotePercentages(data.choices);
		} else {
			console.error('Vote submission failed:', data.message);
		}

		//choices=data["choices"];
		console.log(data)

    } catch (error) {
        console.error('Error submitting vote:', error);
	}
}

function updateVotePercentages(choices) {
    choices.forEach(choice => {
        const percentDiv = document.getElementById(`choice-percent${choice.id}`);
        if (percentDiv) percentDiv.textContent = `${choice.percent}%`;
    });
}
//async function postStatus (statusValue){
	//try {
        //const response = await fetch(BACKENDURL+"/status", {
          //method: 'POST',
          //headers: {
            //'Content-Type': 'application/json'
          //},
          //body: JSON.stringify({ status : statusValue, base64Image : base64Image})
        //});
        //const data = await response.json();
		//console.log(data)

      //} catch (error) {
        //console.error('Error submitting status:', error);
      //}
//}
// let choices = [
//     { id: 1, name: "選択肢A", color: "#FF5900", percent: 55 },
//     { id: 2, name: "選択肢B", color: "#1e00ff", percent: 3 },
//     { id: 3, name: "選択肢C", color: "#15792f", percent: 42 }
// ];



// ページ全体が完全に読み込まれた時に動作する
async function engine(){
	// Matter-Wrapを有効にする
	Matter.use("matter-wrap");

	// ================= canvasFrontへのレンダリング =================

	// 物理エンジン本体のクラス
	const engineFront = Engine.create();

	// 画面を描画するクラス(レンダリング：演算して画像として可視化すること)
	const renderFront = Render.create({
        // bodyタグに描画をする「element: document.getElementById()」指定可能
		element: elementFront,
        // Matter.Engineを使用
		engine: engineFront,
        // オプション
		options: {
            // キャンバスの横幅、縦幅
			width: WIDTH, height: HEIGHT_FRONT,
            // 物理オブジェクトの角度を表示するか
			showAngleIndicator: false,
            // 衝突箇所を表示するか
			showCollisions: false,
            // デバッグを表示するか
			showDebug: false,
            // 物理オブジェクトのIDを表示するか
			showIds: false,
            // 物理オブジェクトの速度を表示するか
			showVelocity: false,
            // 描画エリアの表示に利用
			hasBounds: false,
            // ワイヤーフレームを表示するか(falseにすると画像を表示できる)
			wireframes: false,
			// 背景色設定：透明にする
			background: "rgba(0,0,0,0)"
		}
	});

    // レンダリング開始
	Render.run(renderFront);

    // 物体：壁を配置する
    // 第一引数：x座標, 第二引数：y座標(上の座標が0), 第三引数：横幅, 第四引数：縦幅
	const thick = 100
	// 下の壁
	const below = Bodies.rectangle(WIDTH/2, HEIGHT_FRONT+(thick/2)+1, WIDTH, thick,
		{isStatic: true}
    );
	// 右の壁
    const right = Bodies.rectangle(WIDTH+(thick/2+1), HEIGHT_FRONT/2, thick, HEIGHT_FRONT,
		{isStatic: true}
    );
	// 左の壁
    const left = Bodies.rectangle(-(thick/2+1), HEIGHT_FRONT/2, thick, HEIGHT_FRONT,
		{isStatic: true}
    );
    
	// 用意した2Dオブジェクトを配置
	Composite.add(engineFront.world, [below, right, left]);

	// マウスで操作可能にする
	const mouse = Mouse.create(renderFront.canvas);
	renderFront.mouse = mouse;
	const mouseConstraint = MouseConstraint.create(engineFront, {
		mouse: mouse,
		constraint: {
			stiffness: 0.2,
			render: {visible: false}
		}
	});

	// マウスを配置
	Composite.add(engineFront.world, mouseConstraint);

	// 物理世界を更新する
	const runner = Runner.create();
	Runner.run(runner, engineFront);

	// ================= canvasBackへのレンダリング =================

	// 物理エンジン本体のクラス
	const engineBack = Engine.create();

	// 画面を描画するクラス(レンダリング：演算して画像として可視化すること)
	const renderBack = Render.create({
        // bodyタグに描画をする「element: document.getElementById()」指定可能
		element: document.getElementById("canvasBack"),
        // Matter.Engineを使用
		engine: engineBack,
        // オプション
		options: {
            // キャンバスの横幅、縦幅
			width: WIDTH, height: HEIGHT_BACK,
            // 物理オブジェクトの角度を表示するか
			showAngleIndicator: false,
            // 衝突箇所を表示するか
			showCollisions: false,
            // デバッグを表示するか
			showDebug: false,
            // 物理オブジェクトのIDを表示するか
			showIds: false,
            // 物理オブジェクトの速度を表示するか
			showVelocity: false,
            // 描画エリアの表示に利用
			hasBounds: false,
            // ワイヤーフレームを表示するか(falseにすると画像を表示できる)
			wireframes: false,
			// 背景色設定：透明にする
			background: "rgba(0,0,0,0)"
		}
	});

    // レンダリング開始
	Render.run(renderBack);

    // 物体：壁を配置する
    // 第一引数：x座標, 第二引数：y座標(上の座標が0), 第三引数：横幅, 第四引数：縦幅
	const thick2 = 10;
	const below2 = Bodies.rectangle(WIDTH/2, HEIGHT_BACK+(thick2/2)+1, WIDTH, thick2,
		{isStatic: true}
    );
    const right2 = Bodies.rectangle(WIDTH+(thick2/2+1), HEIGHT_BACK/2, thick2, HEIGHT_BACK,
		{isStatic: true}
    );
    const left2 = Bodies.rectangle(-(thick2/2+1), HEIGHT_BACK/2, thick2, HEIGHT_BACK,
		{isStatic: true}
    );

	// 用意した壁を配置
	Composite.add(engineBack.world, [right2, left2, below2]);

	// 選択肢の数に応じて、仕切りの数を調整して配置
	for (let i = 1; i < choices.length; i++) {
		const partition = Bodies.rectangle(WIDTH / choices.length * i, HEIGHT_BACK/2, 1, HEIGHT_BACK,
			{isStatic: true, render: {opacity: 0}}
		);
		Composite.add(engineBack.world, partition);
	}

	// 過去に投票された物体をまとめて配置する
	// 選択肢が2つのとき ⇒ 1/4 3/4 に壁を配置
	// 選択肢が3つのとき ⇒ 1/6 3/6 5/6 に壁を配置
	const oddNum = [1, 3, 5];
	choices.forEach((choice, index) => {
		const numStack = 30 * choice.percent / 100;
		const stackPlace = WIDTH * oddNum[index] / (choices.length * 2);
		const stack = Composites.stack(0, HEIGHT_BACK/2, numStack, 1, 0, 0, (x, y)=>{
			return Bodies.circle(stackPlace, HEIGHT_BACK/2, itemRadius, {
				restitution: 0.5,
				friction: 0.1,
				angle: Common.random(0, 360),
				render: {
					strokeStyle: "#ffffff",
					sprite: {texture: "./voteBall1.svg", xScale: 1.0, yScale: 1.0}
				}
			});
		});
		Composite.add(engineBack.world, stack);
	});
	
	// 物理世界を更新する
	const runner2 = Runner.create();
	Runner.run(runner2, engineBack);

	// ================= 物体の動き =================

	const startButton = document.getElementById('startButton');
	const filter = document.getElementById('filter');
	const guideLetter = document.getElementById('guideLetter');
	const guideArrow = document.querySelectorAll('.guideArrow');
	const boostButton = document.getElementById('boostButton');
	const boostContentCamera = document.getElementById('boostContentCamera');
	const boostContentStatus = document.getElementById('boostContentStatus');

	// 投票する物体が現れたかを記録する
	let itemAppeared = false;
	// 投票する物体がcanvas2へ移動したかを記録する
	let movedItem = false;
	// ブーストボタンの詳細ボタンが押されたかを記録する
	let detailFlag = true;
	// ブーストボタンのデフォルトの大きさを後に計算するために必要な変数
	let boostButtonHeight;

	// canvas1をはみ出た場合、canvas2へ物体を移動する関数
	function moveToCanvas2() {
		// 選択肢が2つのとき⇒WIDTH/2未満ならA、それ以外はB
		// 選択肢が3つのとき⇒WIDTH/3未満ならA、WIDTH/3*2未満ならB、それ以外はC
		if (item.position.x < WIDTH / choices.length ) {
			itemResult = 1;
			console.log(itemResult);
		} else if (item.position.x < WIDTH / choices.length * 2) {
			itemResult = 2;
			console.log(itemResult);
		} else {
			itemResult = 3;
			console.log(itemResult);
		}

		// ★★★TODO:2つのデータをPOSTする★★★
		// itemResult：投票結果(A or B or C)、itemKinds：投票数(1 or 2)
		//itemResultとitemKindsをPOSTする
		console.log(itemResult);
		console.log(itemKinds);
		console.log(nbc)
		//document.getElementById('inputTrashImage').addEventListener('change', function() {
            //const file = this.files[0];
            //if (file) {
                //const reader = new FileReader();
                //reader.onload = function(e) {
                    //const preview = document.getElementById('preview');
                    //preview.innerHTML = `<img src="${e.target.result}" alt="画像プレビュー">`;
                //};
                //reader.readAsDataURL(file);
				//console.log(file);
            //}
        //});

        //function uploadImage() {
            //const formData = new FormData(document.getElementById('uploadForm'));
            //fetch('upload.php', {
                //method: 'POST',
                //body: formData
            //})
            //.then(response => response.text())
            //.then(data => {
                //alert(data);
            //})
            //.catch(error => {
                //console.error('Error:', error);
            //});
        //}

		submitVote(itemResult, itemKinds, nbc, base64Image, newFileName);
		// choices.forEach((choice) => {
		// 	const choicePercentDiv = document.getElementById("choice-percent" + choice.id);
		// 	choicePercentDiv.textContent = choice.percent + "%";
		// });
		// ブーストボタンを削除
		boostButton.style.display = "none";
		// canvas1からitemを消去
		Composite.remove(engineFront.world, item);
		// canvas2へitem1のx値を継承したitem2を新しく作る
		const item2 = Bodies.circle(item.position.x, -200, itemRadius, {
			restitution: 0.5,
			friction: 0.1,
			angle: Common.random(0, 360),
			render: {
				strokeStyle: "#ffffff",
				sprite: {texture: "./voteBall" + itemKinds + ".svg", xScale: 1.0, yScale: 1.0}
			}
    	});
		// item2を新しく作る
		Composite.add(engineBack.world, item2);

		// もう一度ここでGETしたい。
		// // ★★★TODO:GETする★★★

		

		// クーポン配布
		setTimeout(function() {
			document.getElementById('lastWord').style.display = 'flex';
		}, 3000);
	}

	// 演算ステップの更新直前に発火するbeforeUpdateイベント
	Events.on(engineFront, 'beforeUpdate', function() {
		// canvas1の最大y値を超えた時の処理
		if (itemAppeared && item.position.y < 0 && !movedItem) {
			// canvas2へ物体を移動
			movedItem = true;
			// フィルター、ガイド等を削除
			filter.style.display = 'none';
			guideArrow.forEach(element => element.style.display='none');
			guideLetter.style.display = 'none';
			// canvas2へ移動させる
			moveToCanvas2();
		}
		// エラーが起こり、canvas1の場外へ飛んだ場合「ごめんなさい」
		if (itemAppeared && (item.position.y > HEIGHT_BACK || item.position.x < 0 || item.position.x > WIDTH)) {
			Composite.remove(engineFront.world, item);
			alert("投票玉がスマホ外に飛んだため、エラーが発生しました。再起動します。")
			window.location.reload();
			itemAppeared = false;
		}
	});

	function makeItemAppear() {
		// 出現したことを記録
		itemAppeared = true;
		
		// 物体：ボトルを用意
		// 第一引数：x座標, 第二引数：y座標, 第三引数：横幅
		item = Bodies.circle(WIDTH/2, HEIGHT_FRONT, itemRadius+10, {
			// 2Dオブジェクトの弾性
			restitution: 0.5,
			// 2Dオブジェクトの摩擦係数
			friction: 0.1,
			// 2Dオブジェクトの角度(ラジアン)
			angle: Common.random(0, 0),
			// 画像を指定できる
			render: {
				strokeStyle: "#ffffff",
				sprite: {texture: "./voteBall"+ itemKinds + ".svg", xScale: 1.0, yScale: 1.0}
			}
    	});

		// 用意した2Dオブジェクトを配置
		Composite.add(engineFront.world, item);
	}

	//  ================= ボタンでの動き =================

	// スタートボタンを押したときの処理
	startButton.addEventListener('click', function() {
		// スタートボタンを削除
		startButton.style.display = 'none';

		// 黒フィルター、案内文字、案内ロゴ、ブーストボタンを表示
		filter.style.display = 'block';
		guideArrow.forEach(element => element.style.display='inline');
		guideLetter.style.display = 'flex';
		boostButton.style.display = 'block';
		// ブーストボタンの高さを設定（アコーディオンメニューで使用）
		boostButtonHeight = HEIGHT_BACK - boostButton.offsetHeight - 40;
		itemKinds = 1;
		makeItemAppear();
	});

	// ファイルが変更されたかどうかを確認
	const fileInput = document.getElementById("inputTrashImage");
	fileInput.addEventListener("change", function(e) {
		const selectedFile = e.target.files[0];
		console.log("selectedFile", selectedFile);
		if (selectedFile) {
			boostContentCamera.style.display = 'none';
			boostContentStatus.style.display = 'flex';
			boostContentStatus.style.height = boostButtonHeight + 'px';
			detailFlag = false;

			const reader = new FileReader();
			boostContentStatus.style.display = 'flex';
			boostContentStatus.style.height = boostButtonHeight + 'px';
			detailFlag = false;

			// 元ファイルの拡張子を取得 (例: .jpg, .png)
			const originalExtension = selectedFile.name.split('.').pop();

			// 現在の日時を取得し、形式を整える (例: 20241019_123456)
			const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
	
			// 新しいファイル名を生成 (例: 1234_20241019_123456.jpg)
			newFileName = `${bin_id}_${timestamp}.${originalExtension}`;

			// FileReader を使って画像データを Base64 に変換
			reader.onload = async function () {
				const img = new Image();
				img.src = reader.result;
				console.log("img", img);

            	img.onload = () => {
					console.log("onload");
                	const canvas = document.createElement("canvas");
                	const ctx = canvas.getContext("2d");

                	// 圧縮する最大幅・高さ
                	const maxWidth = 800;
                	const maxHeight = 800;

                	// 元画像のサイズ
                	let width = img.width;
                	let height = img.height;
					console.log("width=", width);
					console.log("height=", height);

                	// アスペクト比を保ちながらリサイズ
                	if (width > height) {
                    	if (width > maxWidth) {
                        	height *= maxWidth / width;
                        	width = maxWidth;
                    	}
                	} else {
                    	if (height > maxHeight) {
                        	width *= maxHeight / height;
                        	height = maxHeight;
                    	}
                	}

                	// Canvas のサイズを設定
                	canvas.width = width;
                	canvas.height = height;

                	// 画像を Canvas に描画
                	ctx.drawImage(img, 0, 0, width, height);

                	// Canvas から圧縮画像を生成（JPEG, 0.8品質）
                	const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
					console.log("canvas", canvas);
					console.log("ctx", ctx);
					base64Image = compressedDataUrl;

                	console.log("圧縮後のBase64:", compressedDataUrl);
				};
				console.log("thrue");
			};

			// ファイル読み込みエラー処理
			reader.onerror = function () {
				console.error("画像ファイルの読み込みに失敗しました:", reader.error);
				alert("画像の読み込みに失敗しました。別のファイルを試してください。");
			};
	
			// ファイルを読み込む
			reader.readAsDataURL(selectedFile);
		} else {
			console.error("ファイルが選択されていません。");
		}
	});

	// ラジオボタンのチェックを確認
	boostContentStatus.addEventListener('click', function() {
		for (var i = 0; i < document.statusForm.status.length; i++) {
			if (document.statusForm.status[i].checked) {
				itemKinds = 2;
				Composite.remove(engineFront.world, item);
				makeItemAppear();
				boostButton.classList.toggle('open');
				boostContentStatus.style.height = '0px';
				detailButton.innerHTML = "<p>詳細を見る</p>";
				guideLetter.innerHTML = "<p><span>二倍投票玉へグレードアップ完了!</span><br>投票玉をタップしながら<br>どちらかへスワイプしよう!</p>"
				console.log(document.statusForm.status[i].value);
				nbc = document.statusForm.status[i].value;
				postStatus(document.statusForm.status[i].value);
			}
		}
	});
	
	// ディティールボタンを押したらコンテンツを開く
	const detailButton = document.getElementById("detailButton")
	detailButton.addEventListener('click', (e) => {
		boostButton.classList.toggle('open');
		if (boostButton.classList.contains('open')) {
			if (detailFlag) {boostContentCamera.style.height = boostButtonHeight + 'px';}
			else {boostContentStatus.style.height = boostButtonHeight + 'px';}
			detailButton.innerHTML = "<p>もどる</p>";
		} else {
			if (detailFlag) {boostContentCamera.style.height = '0px';}
			else {boostContentStatus.style.height = '0px';}
			detailButton.innerHTML = "<p>詳細を見る</p>";
		}
	});
}
