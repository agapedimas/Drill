const Variables = 
{
    Production: (process.env.NODE_ENV == "production"),
	Version: "1.0.0",

	AppIcon: "https://assets.agapedimas.com/icon_logo.ico",
	AppTitle: "Drill",
	AppAssets: this.Production ? "https://assets.agapedimas.com" : "http://localhost:1202",
	
	WebHost: "https://drill.agapedimas.com",
	WebHomepage: "/home",
	WebPing: this.Production ? this.WebHost + "/ping" : "http://localhost:7199/ping",
}

module.exports = Variables;