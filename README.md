# Mobile Health Usability

This app is designed for the mobile health usability study.
It includes functionality to measure PPG from the finger using the back camera
of a smartphone, and functionality to measure respiration rate using the
selfie camera of a smartphone.

## Running the Code

In order to use the MediaPipe framework needed for body tracking, the app must
be served over an encrypted web server.
One way to do this is to run open a terminal to the root directory of this
repository, and run: `python -m http.server`
This command will open a server on the localhost such that you can open
`127.0.0.1:8000/app` in your computer browser and see the app.
However, you will run into issues loading the MediaPipe framework because
localhost is still not encrypted, and you still will not be able to open the
app on your phone.
One way to encrypt localhost is to follow instructions on the
[ngrok website](https://ngrok.com/) to create an account and download the ngrok
tool.
Locally, you will run the command: `ngrok http 8000`.
When you run this command, it will give you a really long URL similar to:
`https://<REALLY-LONG-STRING>.ngrok.io/`.
This URL redirects to your local server, but the `https` part indicates that it
is encrypted.
Now, you will be able to open the app on your phone by going to:
`https://<REALLY-LONG-STRING>.ngrok.io/app/` on your phone's browser.

## Writing Code

To add a new page, the easiest thing to do is copy `index.html` and start
modifying that.
In general, `style.css` and `app.js` are included in all pages.
The former creates a cohesive appearance across all pages, and the latter
provides logic applicable to all pages.

When you create a new page, such as `my_new_page.html`, its URL will be 
`https://<REALLY-LONG-STRING>.ngrok.io/app/my_new_page.html`.
For example, the measurement page's code is in `measurement.html` and the URL
is: `https://<REALLY-LONG-STRING>.ngrok.io/app/measurement.html`.
To link to it, you don't need to provide the full URL, but simply provide a
relative link, such as pointing a button or link to `measurement.html`.
However, be aware of the full URL, so you can test individual pages by going
straight to it without starting from the beginning of the app each time.