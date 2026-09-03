# MMM-MySlideshow

Custom background slideshow module for MagicMirror².

## Configuration

Add the module to the modules array in the `config/config.js` file:

```javascript
  {
    module: 'MMM-MySlideshow',
    position: 'fullscreen_below',
    config: {
      imagePaths: ['modules/MMM-MySlideshow/exampleImages/'],
      transitionImages: true,
      randomizeImageOrder: true
    }
  },
```

I also recommend adding the following to the `custom.css` to make the text a little brighter:

```css
.normal,
.dimmed,
header,
body {
  color: #fff;
}
```

## Update

To update the module, go to the module directory, pull the latest changes, and install any new dependencies:

```sh
cd ~/MagicMirror/modules/MMM-BackgroundSlideshow
git pull
npm install
```

## Notification options

The following notifications can be used:

<table width="100%">
  <!-- why, markdown... -->
  <thead>
    <tr>
      <th>Notification</th>
      <th width="100%">Description</th>
    </tr>
  <thead>
  <tbody>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_UPDATE_IMAGE_LIST</code></td>
      <td>Reload images list and start slideshow from first image. Works best when sorted by modified date descending.<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_NEXT</code></td>
      <td>Change to the next image, restart the timer for image changes only if already running<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PREVIOUS</code></td>
      <td>Change to the previous image, restart the timer for image changes only if already running<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PAUSE</code></td>
      <td>Pause the timer for image changes<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_PLAY</code></td>
      <td>Change to the next image and start the timer for image changes<br>
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_URL</code></td>
      <td>Show an image by passing an object with a URL. Include resume=true to continue slideshow after displaying image, otherwise the image will display until another notification such as BACKGROUNDSLIDESHOW_PLAY.
       <br>Example payload: {url:'url_to_image', resume: true}
      </td>
    </tr>
    <tr>
      <td><code>BACKGROUNDSLIDESHOW_URLS</code></td>
      <td>Pass in a list of URLs to display in the background.  To continue showing photos, pass in an empty array or no payload.
       <br>Example payload: {urls:['url_to_image', 'url_to_image']}
      </td>
    </tr>
</table>

## Configuration options

The following properties can be configured:

<table width="100%">
  <!-- why, markdown... -->
  <thead>
    <tr>
      <th>Option</th>
      <th width="100%">Description</th>
    </tr>
  <thead>
  <tbody>
    <tr>
      <td><code>imagePaths</code></td>
      <td>Array value containing strings. Each string should be a path to a directory where image files can be found.  Can be relative or absolute<br>
        <br><b>Example:</b> <code>['modules/MMM-BackgroundSlideshow/exampleImages/']</code>
        <br><b>Example:</b> <code>['/images/']</code>
        <br>This value is <b>REQUIRED</b>
      </td>
    </tr>
    <tr>
      <td><code>excludePaths</code></td>
      <td>Array value containing strings. When scanning subdirectories for
      images, directories with these names will be ignored.<br>
        <br><b>Example:</b> <code>['@eaDir']</code>
        <br><b>Default value:</b> <code>['@eaDir']</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>slideshowSpeed</code></td>
      <td>Integer value, the length of time to show one image before switching to the next, in milliseconds.<br>
        <br><b>Example:</b> <code>6000</code> for 6 seconds
        <br><b>Default value:</b> <code>10000</code> or 10 seconds
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>resizeImages</code></td>
      <td>Boolean value, if images should be resized or not.  For better performance, this should be true and the height and width set to the resolution of the monitor being used<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>maxWidth</code></td>
      <td>Integer value, the width the image should be resized to.<br>
        <br><b>Example:</b> <code>3840</code>
        <br><b>Default value:</b> <code>1920</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>maxHeight</code></td>
      <td>Integer value, the height the image should be resized to.<br>
        <br><b>Example:</b> <code>2160</code>
        <br><b>Default value:</b> <code>1080</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>randomizeImageOrder</code></td>
      <td>Boolean value, if true will randomize the order of the images, otherwise use sortImagesBy and sortImagesDescending sorting by filename.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>randomizeImagesLoopFolders</code></td>
      <td>Boolean value, if true will randomize the order of all images and then create a filelist so that the images will ordered to show one image from each subfolder before next image index is shown. Subfolders with fewer images will loop so that all subfolders will get equal amount of time in the spotlight<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showAllImagesBeforeRestart</code></td>
      <td>Boolean value, if true will keep track of all the allready shown files and not show them untill all images has been shown<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>sortImagesBy</code></td>
      <td>String value, determines how images are sorted.  Possible values are: name (by file name), created (by file created date), modified (by file
      modified date). Only used if randomizeImageOrder is set to false.<br>
        <br><b>Example:</b> <code>created</code>
        <br><b>Default value:</b> <code>name</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>sortImagesDescending</code></td>
      <td>Boolean value, if true will sort images in descending order, otherwise in ascending order. Only used if randomizeImageOrder is set to false.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
        <tr>
      <td><code>recursiveSubDirectories</code></td>
      <td>Boolean value, if true it will scan all sub-directories in the imagePaths.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
        <tr>
      <td><code>validImageFileExtensions</code></td>
      <td>String value, a list of image file extensions, separated by commas, that should be included. Files found without one of the extensions will be ignored.<br>
        <br><b>Example:</b> <code>'png,jpg'</code>
        <br><b>Default value:</b> <code>'bmp,jpg,jpeg,gif,png'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showImageInfo</code></td>
      <td>Boolean value, if true a div containing the currently displayed image information will be shown.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfoLocation</code></td>
      <td>String value, determines which corner of the screen the image info div should be displayed in.  Possible values are: bottomRight, bottomLeft, topLeft, topRight<br>
        <br><b>Example:</b> <code>topLeft</code>
        <br><b>Default value:</b> <code>bottomRight</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfo</code></td>
      <td>String value, a list of image properties to display in the image info div, separated by commas.  Possible values are : date (EXIF date from image), name (image name).
      For the iamge name, the relative path from that defined in imagePaths is displayed if the recursiveSubDirectories option is set to true.<br>
        <br><b>Example:</b> <code>date,name</code>
        <br><b>Default value:</b> <code>name</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>imageInfoNoFileExt</code></td>
      <td>Boolean value, if true the file extension will be removed before the image name is displayed.
      <br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>      <tr>
      <td><code>transitionSpeed</code></td>
      <td>Transition speed from one image to the other, transitionImages must be true. Must be a valid css transition duration.<br>
        <br><b>Example:</b> <code>'2s'</code>
        <br><b>Default value:</b> <code>'1s'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showProgressBar</code></td>
      <td>Boolean value, if true a progress bar indicating how long till the next image is
      displayed is shown.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>backgroundSize</code></td>
      <td>The sizing of the background image. Values can be:<br>
        cover: Resize the background image to cover the entire container, even if it has to stretch the image or cut a little bit off one of the edges.<br>
        contain: Resize the background image to make sure the image is fully visible<br>
        <br><b>Example:</b> <code>'contain'</code>
        <br><b>Default value:</b> <code>'cover'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>backgroundPosition</code></td>
      <td>Determines where the background image is placed if it doesn't fill the whole screen (i.e. backgroundSize is 'contain'). Module already defaults to 'center', so the most useful options would be: 'top' 'bottom' 'left' or 'right'. However, any valid value for CSS background-position could be used.<br>
        <br><b>Example:</b> <code>'top'</code>
        <br><b>Default value:</b> <code>'center'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>transitionImages</code></td>
      <td>Transition from one image to the other (may be a bit choppy on slower devices, or if the images are too big).<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>gradient</code></td>
      <td>The vertical gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
              <br><b>Default value:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%",
        "rgba(0, 0, 0, 0) 80%",
        "rgba(0, 0, 0, 0.75) 100%"
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>horizontalGradient</code></td>
      <td>The horizontal gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
              <br><b>Default value:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%",
        "rgba(0, 0, 0, 0) 80%",
        "rgba(0, 0, 0, 0.75) 100%"
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
        <tr>
      <td><code>radialGradient</code></td>
      <td>A radial gradient to make the text more visible.  Enter gradient stops as an array.<br>
        <br><b>Example:</b> <code>[
        "rgba(0, 0, 0, 0.75) 0%",
        "rgba(0, 0, 0, 0) 40%"
        ]</code>
          <br><b>Default value:</b> <code>[
                    "rgba(0,0,0,0) 0%",
                    "rgba(0,0,0,0) 75%",
                    "rgba(0,0,0,0.25) 100%""
        ]</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
      <tr>
      <td><code>gradientDirection</code></td>
      <td>The direction of the gradient<br>
        <br><b>Example:</b> <code>'horizontal'</code>
        <br><b>Default value:</b> <code>'vertical'</code>
        <br><b>Possible values:</b> <code>'vertical', 'horizontal', 'both', 'radial'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>backgroundAnimationEnabled</code></td>
      <td>Boolean value, if set to true the background will scroll if the picture is larger than the screen size (e.g. for panaramic pictures).  The picture will either scroll vertically or horizontally depending on which dimension extends beyond the screen size.
      <b>Note:</b> For this to work, backgroundSize must be set to cover.<br>
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>transitions</code></td>
      <td>Array value containing strings defining what transitions to perform.
      <b>Note:</b> transitionImages must be set to true.<br>
        <br><b>Example:</b> <code>['opacity', 'slideFromLeft']</code>
        <br><b>Default value:</b> <code>['opacity', 'slideFromRight', 'slideFromLeft', 'slideFromTop', 'slideFromBottom', 'slideFromTopLeft', 'slideFromTopRight', 'slideFromBottomLeft', 'slideFromBottomRight', 'flipX', 'flipY']</code>
        <br><b>Possible values:</b> <code>'opacity', 'slideFromRight', 'slideFromLeft', 'slideFromTop', 'slideFromBottom', 'slideFromTopLeft', 'slideFromTopRight', 'slideFromBottomLeft', 'slideFromBottomRight', 'flipX', 'flipY'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>transitionTimingFunction</code></td>
      <td>CSS timing function used with transitions.
      <b>Note:</b> transitionImages must be set to true.<br>
        <br><b>Example:</b> <code>'ease-in</code>
        <br><b>Default value:</b> <code>'cubic-bezier(.17,.67,.35,.96)'</code>
        <br><b>Possible values:</b> <code>'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(n,n,n,n)'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>animations</code></td>
      <td>Array value containing strings defining what animations to perform.
      <b>Note:</b> backgroundAnimationEnabled must be set to true.<br>
        <br><b>Example:</b> <code>'ease-in</code>
        <br><b>Default value:</b> <code>['slide', 'zoomOut', 'zoomIn']</code>
        <br><b>Possible values:</b> <code>'slide', 'zoomOut', 'zoomIn'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>changeImageOnResume</code></td>
      <td>Should the image be changed in the moment the module resumes after it got hidden?
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>false</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showPortraitMap</code></td>
      <td>Boolean value, if true displays a mini map on the side margin for portrait (vertical) photos with GPS coordinates.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapPosition</code></td>
      <td>Position of the portrait map. Possible values: <code>'leftCenter'</code>, <code>'leftTop'</code>, <code>'leftBottom'</code>.
        <br><b>Example:</b> <code>'leftCenter'</code>
        <br><b>Default value:</b> <code>'leftCenter'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapWidth</code></td>
      <td>Width of the portrait map container in pixels or CSS unit (<code>'auto'</code> automatically fits the left margin).
        <br><b>Example:</b> <code>500</code>
        <br><b>Default value:</b> <code>'auto'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapHeight</code></td>
      <td>Height of the portrait map canvas in pixels or CSS unit (<code>'auto'</code> fits the full photo height).
        <br><b>Example:</b> <code>'calc(100% - 48px)'</code>
        <br><b>Default value:</b> <code>'auto'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapZoom</code></td>
      <td>Zoom level of the Leaflet map (1 to 18). Default is 6 to display the entire country.
        <br><b>Example:</b> <code>6</code>
        <br><b>Default value:</b> <code>6</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapFitCountry</code></td>
      <td>Boolean value, automatically fits the bounding box of the entire country into view.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapTileTheme</code></td>
      <td>Tile layer theme for the map. Values: <code>'dark'</code> (CartoDB Dark Matter), <code>'voyager'</code> (CartoDB Voyager), <code>'osm'</code> (Standard OpenStreetMap).
        <br><b>Example:</b> <code>'dark'</code>
        <br><b>Default value:</b> <code>'dark'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapApiKey</code></td>
      <td>API Key for CartoDB basemap tile access.
        <br><b>Example:</b> <code>'cb1_2sbq_1_...'</code>
        <br><b>Default value:</b> <code>'cb1_2sbq_1_5ce7e2903fefa17bc3ed219d'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapHighlightCountry</code></td>
      <td>Boolean value, highlights the country boundary polygon on the map with custom color.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapHighlightColor</code></td>
      <td>Hex/CSS color for the highlighted country area and border.
        <br><b>Example:</b> <code>'#00d2d3'</code>
        <br><b>Default value:</b> <code>'#00d2d3'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitMapShowLocationName</code></td>
      <td>Boolean value, if true displays the reverse-geocoded location name above the map.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>showPortraitInfo</code></td>
      <td>Boolean value, if true displays taken date, city, and country in large white centered text in the right margin for portrait (vertical) images.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitInfoStyle</code></td>
      <td>String value, visual container style on the right margin. Options: <code>'card'</code> (frosted glass container matching the map) or <code>'transparent'</code> (no background box, text only).
        <br><b>Example:</b> <code>'card'</code>
        <br><b>Default value:</b> <code>'card'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitInfoOrder</code></td>
      <td>String value, order of displayed elements. Options: <code>'dateFirst'</code> (date on top, city and country below) or <code>'locationFirst'</code>.
        <br><b>Example:</b> <code>'dateFirst'</code>
        <br><b>Default value:</b> <code>'dateFirst'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitDateTimeFormat</code></td>
      <td>String value, moment format for the taken date line.
        <br><b>Example:</b> <code>'YYYY년 M월 D일'</code>
        <br><b>Default value:</b> <code>'YYYY년 M월 D일'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitTimeFormat</code></td>
      <td>String value, moment format for the taken time line.
        <br><b>Example:</b> <code>'HH:mm'</code>
        <br><b>Default value:</b> <code>'HH:mm'</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>portraitShowTime</code></td>
      <td>Boolean value, if true shows the photo capture time below the date.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    <tr>
      <td><code>hideImageInfoForPortrait</code></td>
      <td>Boolean value, if true hides the standard small image info box (which might overlap the map) when displaying a portrait photo.
        <br><b>Example:</b> <code>true</code>
        <br><b>Default value:</b> <code>true</code>
        <br>This value is <b>OPTIONAL</b>
      </td>
    </tr>
    </tbody>
</table>

### How to manually exclude images from a folder

Create a file called `excludeImages.txt` that you put in the same folder as the images you want to exclude (one for each directory!)

Add the filenames you want to exclude to the file, one filename per row.
That's it!

## Developer commands

- `node --run lint` - Run linting and formatter checks.
- `node --run lint:fix` - Fix linting and formatter issues.
