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