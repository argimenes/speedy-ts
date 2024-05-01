(function (factory) {
    define("parts/youtube-player", ["knockout", "app/helpers", "pubsub"], factory);
}(function (ko, Helper, pubsub) {

    const { loadScript } = Helper;

    window.isYouTubeIframeAPIReady = false;

    if (typeof window.onYouTubeIframeAPIReady == "undefined") {
        window.onYouTubeIframeAPIReady = function () {
            window.isYouTubeIframeAPIReady = true;
            pubsub.publish("youtube-api-ready");
        }
        loadScript("https://www.youtube.com/iframe_api");
    } else {
        window.isYouTubeIframeAPIReady = true;
    }

    class YouTubePlayer {
        constructor(data) {
            data = data || {};
            data.handler = data.handler || {};
            this.container = data.container;
            this.identifier = data.identifier;
            this.height = data.height || 315;
            this.width = data.width || 560;
            this.done = false;
            this.player;
            this.handler = data.handler;
            this.setupEventHandlers();
        }
        setupEventHandlers() {
            var self = this;
            if (window.isYouTubeIframeAPIReady) {
                this.onElementReady();
            }
            pubsub.subscribe("youtube-api-ready", function () {
                self.onElementReady();
            });
        }
        getIframe() {
            return this.player.getIframe();
        }
        getCurrentTime() {
            return this.player.getCurrentTime();
        }
        skip(s) {
            var t = this.getCurrentTime();
            this.player.seekTo(t + s);
        }
        seekTo(s) {
            this.player.seekTo(s);
        }
        playVideo() {
            this.player.playVideo();
        }
        stopVideo() {
            this.player.stopVideo();
        }
        onPlayerReady(e) {
            if (this.handler.onPlayerReady) {
                this.handler.onPlayerReady(this);
            }
            //e.target.playVideo();
        }
        onStateChange(e) {
            if (e.data == YT.PlayerState.PLAYING && false == this.done) {
                // setTimeout(this.stopVideo.bind(this), 6000);
                this.done = true;
            }
        }
        createPlayer() {
            var self = this;
            this.player = new YT.Player(this.container, {
                height: this.height,
                width: this.width,
                videoId: this.identifier,
                events: {
                    onReady: (e) => {
                        self.onPlayerReady(e);
                    },
                    onStateChange: (e) => {
                        self.onStateChange(e);
                    }
                }
            });
        }
        onElementReady() {
            this.createPlayer();
        }
    }

    return YouTubePlayer;

}));