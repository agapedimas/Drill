const isProduction = (process.env.NODE_ENV == "production");

const Variables = 
{
    Production: isProduction,
	Version: "1.1.8",

	AppIcon: "https://assets.agapedimas.com/icon_logo.ico",
	AppTitle: "Drill",
	AppTitleAdmin: "Drill for Admin",
	AppThumbnail: "",
	AppAssets: isProduction ? "https://assets.agapedimas.com" : "http://localhost:1202",
	
	WebHost: "https://drill.agapedimas.com",
	WebHomepage: "/home",
	WebPing: isProduction ? "https://drill.agapedimas.com/ping" : "http://localhost:7199/ping",
}

module.exports = Variables;