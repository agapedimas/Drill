const as = document.querySelectorAll("nav a[goto]");

for (let a of as)
{
    const href = a.getAttribute("goto");

    if (href && window.location.pathname.endsWith(href))
    {
        if (href == "/" && window.location.pathname == "/")
            a.classList.add("active");
        else if (href != "/")
            a.classList.add("active");
    }
    else
    {
        a.classList.remove("active");
    }
}

Courses.Pins.AppendSidebar();

let Search_Timeout;
Input_SearchGlobal.oninput = function()
{
    clearTimeout(Search_Timeout);
    if (window.location.pathname.startsWith("/search") == false)
    {
        if (this.value.trim() != "")
        {
            Search_Timeout = setTimeout(async function()
            { 
                let url = new URL(window.location.origin + "/search");
                url.searchParams.set("q", Input_SearchGlobal.value.trim());
                window.location.href = url.href;
            }, 500);
        }
    }
}