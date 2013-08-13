var cast = window.cast || {};

(function() {
    'use strict';

    // Set up namespace.
    Dash.PROTOCOL = 'org.dashif.dashjs';

    // Application code.

    function Dash() {
        this.manifest = null;

        var startVideo = function(url) {
                console.log("Loading video: " + url);

                var video,
                    context,
                    player;

                context = new Dash.di.DashContext();
                player = new MediaPlayer(context);
                player.startup();

                player.setIsLive(false);
                player.attachSource(url);

                $("#spinner").hide();

                video = document.querySelector(".dash-video-player video"),
                player.autoPlay = true;
                player.attachView(video);
            },

            onDashMessage = function (e) {
                var message = e.message;
                var channel = e.target;
                console.debug('Message received', JSON.stringify(message));

                switch (message.command) {
                    case "load":
                        startVideo.call(this, message.manifest);
                        break;
                }
            },

            onDashOpen = function (e) {
                console.log("Dash channel opened.");
                broadcast.call(this, {
                   event: "ready"
                });
            },

            onDashClose = function (e) {
                console.log("Dash channel closed.");
            },

            broadcast = function (message) {
                message.timestamp = new Date();
                this.dashHandler.getChannels().forEach(function (channel) {
                    channel.send(message);
                });
            };

        this.setDashHandler = function (dh) {
            this.dashHandler = dh;

            this.dashHandler.addEventListener(cast.receiver.Channel.EventType.MESSAGE, onDashMessage.bind(this));
            this.dashHandler.addEventListener(cast.receiver.Channel.EventType.OPEN, onDashOpen.bind(this));
            this.dashHandler.addEventListener(cast.receiver.Channel.EventType.CLOSE, onDashClose.bind(this));
        }
    }

    // Expose to public.
    cast.Dash = Dash;
})();

function onLoad() {
    var APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e",
        receiver = new cast.receiver.Receiver(APP_ID, [cast.Dash.PROTOCOL]);

    var dash = new cast.Dash();

    var dashHandler = new cast.receiver.ChannelHandler(cast.Dash.PROTOCOL);
    dashHandler.addChannelFactory(receiver.createChannelFactory(cast.Dash.PROTOCOL));
    dash.setDashHandler(dashHandler);

    receiver.start();
}

window.onload = onLoad;
