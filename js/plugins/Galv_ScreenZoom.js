//-----------------------------------------------------------------------------
//  Galv's Screen Zoom
//-----------------------------------------------------------------------------
//  For: RPGMAKER MV
//  Galv_ScreenZoom.js
//-----------------------------------------------------------------------------
//  2017-03-10 - Version 1.1 - fixed bug in battle zoom, added battle scale
//  2017-02-10 - Version 1.0 - release
//-----------------------------------------------------------------------------
// Terms can be found at:
// galvs-scripts.com
//-----------------------------------------------------------------------------

var Imported = Imported || {};
Imported.Galv_ScreenZoom = true;

var Galv = Galv || {};              // Galv's main object
Galv.ZOOM = Galv.ZOOM || {};          // Galv's stuff


//-----------------------------------------------------------------------------
/*:
 * @plugindesc GV屏幕镜头缩放[v.1.1]
 * @author Galv - galvs-scripts.com
 *
 * @param Battle Zoom
 * @text 战斗缩放
 * @desc 战斗开始时的缩放比例
 * Default: 1 (100%)
 * @default 1
 *
 * @help
 * Galv's Screen Zoom
==============================================================================
   介绍
==============================================================================
 * 此插件允许你将屏幕缩放到特定的x、y像素位置
 * 可以设置缩放比例和完成缩放所需的时间
 * 只有地图事件会受缩放影响——消息窗口和其他场景不会
 * 通过再次调用脚本并设置不同的x、y位置或缩放比例，可以移动缩放后的屏幕
 *
 *
Galv.ZOOM.move(x,y,scale,duration);   // 缩放到x、y位置
 *                                       // 缩放比例1=100%
 *                                       // 持续时间以帧为单位
 *
Galv.ZOOM.target(id,scale,duration);  // 缩放到事件ID，0为玩家
 *
Galv.ZOOM.center(scale,duration);     // 缩放到屏幕中心
 *
Galv.ZOOM.restore(duration);          // 将缩放恢复为正常状态
 

==============================================================================
   脚本运用
==============================================================================
 
 1. 缩放至指定坐标
 将屏幕在 30 帧内缩放到坐标 (320, 240)，缩放比例为 1.5 倍（150%）：
Galv.ZOOM.move(320, 240, 1.5, 30);
 
 
 2. 缩放至事件/玩家
 缩放至 ID 为 5 的事件，2 倍缩放，60 帧完成：
Galv.ZOOM.target(5, 2, 60);
 
 
 缩放至玩家（ID 为 0），1.2 倍缩放，45 帧完成：
Galv.ZOOM.target(0, 1.2, 45);
 
 
 3. 缩放至屏幕中心
以屏幕中心为焦点，1.8 倍缩放，30 帧完成：
Galv.ZOOM.center(1.8, 30);


 4. 恢复正常缩放
用 20 帧将屏幕从当前缩放状态恢复到 100%：
Galv.ZOOM.restore(20);
 
 
 
 
 * 注意：
   插件不能直接让玩家镜头 “跳转” 到事件位置，而是通过平滑缩放 + 移
   动的方式聚焦到目标事件
 * 如果同时移动x、y位置和调整缩放比例，可能会出现奇怪的屏幕弧形运动
 * 目前尚未找到很好的解决方法，特此说明 :)
 *
 * 此插件不会修改地图的运行方式，仅对屏幕进行缩放和平移。
 * 这意味着如果你的地图与屏幕大小相同，当你放大时，玩家移动不会
 * 平移缩放后的屏幕
 */



//-----------------------------------------------------------------------------
//  CODE STUFFS
//-----------------------------------------------------------------------------

(function() {
	
Galv.ZOOM.battleScale = Number(PluginManager.parameters('GALV_ScreenZoom')["Battle Zoom"]);

Galv.ZOOM.setTo = function(x,y) {
	if ($gameScreen._zoomScale == 1) {
		$gameScreen._zoomX = x;
		$gameScreen._zoomY = y;
	}
};

Galv.ZOOM.move = function(x,y,scale,duration) {
	$gameScreen.startZoom(x,y,scale,duration);
};

Galv.ZOOM.center = function(scale,duration) {
	var x = Graphics.boxWidth / 2;
	var y = Graphics.boxHeight / 2;
	$gameScreen.startZoom(x,y,scale,duration);
};

Galv.ZOOM.target = function(id,scale,duration) {
	if (id <= 0) {
		var target = $gamePlayer;
	} else {
		var target = $gameMap.event(id);
	}
	var x = target.screenX();
	var y = target.screenY() - 12 - scale;
	$gameScreen.startZoom(x,y,scale,duration);
};

Galv.ZOOM.restore = function(duration) {
	var x = Graphics.boxWidth / 2;
	var y = Graphics.boxHeight / 2;
	$gameScreen.startZoom(x,y,1,duration);
};

Galv.ZOOM.saveZoomData = function() {
	$gameSystem._savedZoom.x = Number($gameScreen._zoomX);
	$gameSystem._savedZoom.xTarget = Number($gameScreen._zoomXTarget);
	$gameSystem._savedZoom.y = Number($gameScreen._zoomY);
	$gameSystem._savedZoom.yTarget = Number($gameScreen._zoomYTarget);
	$gameSystem._savedZoom.scale = Number($gameScreen._zoomScale);
	$gameSystem._savedZoom.scaleTarget = Number($gameScreen._zoomScaleTarget);
	$gameSystem._savedZoom.duration = Number($gameScreen._zoomDuration);
};


//-----------------------------------------------------------------------------
//  GAME SYSTEM
//-----------------------------------------------------------------------------

Galv.ZOOM.Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	Galv.ZOOM.Game_System_initialize.call(this);
	var cx = Graphics.boxWidth / 2;
	var cy = Graphics.boxHeight / 2
	this._savedZoom = {
		x: cx,
		y: cy,
		xTarget: cx,
		yTarget: cy,
		scale: 1,
		scaleTarget: 1,
		duration: 0
	}
};


//-----------------------------------------------------------------------------
//  GAME SCREEN
//-----------------------------------------------------------------------------

// Overwrite
Game_Screen.prototype.startZoom = function(x, y, scale, duration) {
	Galv.ZOOM.setTo(x,y);

	var cx = Graphics.boxWidth / 2;
	if (x < 0) {
		x = this._zoomX;
	} else if (x != cx) {
		var pox = Graphics.boxWidth / (scale * 2 - 2);
		var difX = cx - x;
		if (difX != 0) difX = (difX / cx) * pox;
		x = x - difX;
	}

	var cy = Graphics.boxHeight / 2;	
	if (y < 0) {
		y = this._zoomY;
	} else if (y != cy) {
		var poy = Graphics.boxHeight / (scale * 2 - 2);
		var difY = cy - y;
		if (difY != 0) difY = (difY / cy) * poy;
		y = y - difY;
	}

	this._zoomXTarget = Math.min(Graphics.boxWidth,Math.max(x,0));
	this._zoomYTarget = Math.min(Graphics.boxHeight,Math.max(y,0));

    this._zoomScaleTarget = scale < 0 ? this._zoomScale : scale;
    this._zoomDuration = duration || 60;
};

// Overwrite
Game_Screen.prototype.updateZoom = function() {
    if (this._zoomDuration > 0) {
        var d = this._zoomDuration;
        var t = this._zoomScaleTarget;
        this._zoomScale = (this._zoomScale * (d - 1) + t) / d;
		this._zoomX = (this._zoomX * (d - 1) + this._zoomXTarget) / d;
		this._zoomY = (this._zoomY * (d - 1) + this._zoomYTarget) / d;	
        this._zoomDuration--;
    }
};

// Overwrite
Game_Screen.prototype.clearZoom = function() {
	this._zoomX = Number($gameSystem._savedZoom.x);
	this._zoomXTarget = Number($gameSystem._savedZoom.xTarget);
	this._zoomY = Number($gameSystem._savedZoom.y);
	this._zoomYTarget = Number($gameSystem._savedZoom.yTarget);
	this._zoomScale = Number($gameSystem._savedZoom.scale);
	this._zoomScaleTarget = Number($gameSystem._savedZoom.scaleTarget);
	this._zoomDuration = Number($gameSystem._savedZoom.duration);
};


Galv.ZOOM.Game_Screen_onBattleStart = Game_Screen.prototype.onBattleStart;
Game_Screen.prototype.onBattleStart = function() {
	Galv.ZOOM.saveZoomData();
	Galv.ZOOM.dontSave = true;
	Galv.ZOOM.Game_Screen_onBattleStart.call(this);
};

Game_Screen.prototype.resetBattleZoom = function() {
	this._zoomX = Graphics.boxWidth / 2;
	this._zoomXTarget = Graphics.boxWidth / 2;
	this._zoomY = Graphics.boxHeight / 2;
	this._zoomYTarget = Graphics.boxHeight / 2
	this._zoomScale = Galv.ZOOM.battleScale;
	this._zoomScaleTarget = Galv.ZOOM.battleScale;
	this._zoomDuration = 0;
};


//-----------------------------------------------------------------------------
//  SCENE MAP
//-----------------------------------------------------------------------------

Galv.ZOOM.Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
	$gameScreen.clearZoom();
	Galv.ZOOM.Scene_Map_start.call(this);
};

Galv.ZOOM.Scene_Map_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function() {
	if (!Galv.ZOOM.dontSave) Galv.ZOOM.saveZoomData();
	Galv.ZOOM.Scene_Map_terminate.call(this);
};


//-----------------------------------------------------------------------------
//  SCENE BATTLE
//-----------------------------------------------------------------------------

Galv.ZOOM.Scene_Battle_start = Scene_Battle.prototype.start;
Scene_Battle.prototype.start = function() {
	$gameScreen.resetBattleZoom();
	Galv.ZOOM.Scene_Battle_start.call(this);
};

Galv.ZOOM.Scene_Battle_terminate = Scene_Battle.prototype.terminate;
Scene_Battle.prototype.terminate = function() {
	Galv.ZOOM.dontSave = false;
	Galv.ZOOM.Scene_Battle_terminate.call(this);
};

})();