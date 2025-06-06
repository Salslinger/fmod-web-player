/*==============================================================================
Play Sound Example
Copyright (c), Firelight Technologies Pty, Ltd 2004-2016.

This example shows how to simply load and play multiple sounds, the simplest
usage of FMOD. By default FMOD will decode the entire file into memory when it
loads. If the sounds are big and possibly take up a lot of RAM it would be
better to use the FMOD_CREATESTREAM flag, this will stream the file in realtime
as it plays.

For information on using FMOD example code in your own programs, visit
https://www.fmod.com/legal
==============================================================================*/

//==============================================================================
// Prerequisite code needed to set up FMOD object.  See documentation.
//==============================================================================

var FMOD = {};                          // FMOD global object which must be declared to enable 'main' and 'preRun' and then call the constructor function.
FMOD['preRun'] = prerun;                // Will be called before FMOD runs, but after the Emscripten runtime has initialized
FMOD['onRuntimeInitialized'] = main;    // Called when the Emscripten runtime has initialized
FMOD['INITIAL_MEMORY'] = 64*1024*1024;  // FMOD Heap defaults to 16mb which is enough for this demo, but set it differently here for demonstration (64mb)
FMODModule(FMOD);                       // Calling the constructor function with our object

//==============================================================================
// Example code
//==============================================================================

var gSystem;                            // Global 'System' object which has the top level API functions.  Sounds and channels are created from this.
var gSound = {};                        // Array of 3 sounds.
var gChannel;                           // Last channel that is playing a sound.
var gEffects;                           // boolean to toggle effects on or off
var gDSP;                               // handle to reverb DSP effect.

// Simple error checking function for all FMOD return values.
function CHECK_RESULT(result)
{
    if (result != FMOD.OK)
    {
        var msg = "Error!!! '" + FMOD.ErrorString(result) + "'";

        alert(msg);

        throw msg;
    }
}

// Will be called before FMOD runs, but after the Emscripten runtime has initialized
// Call FMOD file preloading functions here to mount local files.  Otherwise load custom data from memory or use own file system. 
function prerun()
{
    var fileUrl = "/public/js/";
    var fileName;
    var folderName = "/";
    var canRead = true;
    var canWrite = false;

    fileName = [
        "dog.wav",
        "lion.wav",
        "wave.mp3"
    ];

    for (var count = 0; count < fileName.length; count++)
    {
        FMOD.FS_createPreloadedFile(folderName, fileName[count], fileUrl + fileName[count], canRead, canWrite);
    }
}

// Called when the Emscripten runtime has initialized
function main()
{
    // A temporary empty object to hold our system
    var outval = {};
    var result;

    console.log("Creating FMOD System object\n");

    // Create the system and check the result
    result = FMOD.System_Create(outval);
    CHECK_RESULT(result);

    console.log("grabbing system object from temporary and storing it\n");

    // Take out our System object
    gSystem = outval.val;

    // Optional.  Setting DSP Buffer size can affect latency and stability.
    // Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
    console.log("set DSP Buffer size.\n");
    result = gSystem.setDSPBufferSize(2048, 2);
    CHECK_RESULT(result);

    // Optional.  Set sample rate of mixer to be the same as the OS output rate.
    // This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
    console.log("Set mixer sample rate");
    result = gSystem.getDriverInfo(0, null, null, outval, null, null);
    CHECK_RESULT(result);
    result = gSystem.setSoftwareFormat(outval.val, FMOD.SPEAKERMODE_DEFAULT, 0)
    CHECK_RESULT(result);

    console.log("initialize FMOD\n");

    // 1024 virtual channels
    result = gSystem.init(1024, FMOD.INIT_NORMAL, null);
    CHECK_RESULT(result);

    console.log("initialize Application.");
    initApplication();

    // Starting up your typical JavaScript application loop. Set the framerate to 50 frames per second, or 20ms.
    console.log("Start game loop\n");
    window.setInterval(updateApplication, 20);

    return FMOD.OK;
}

// Function called when user drags HTML range slider.
function volumeChanged(val)
{
    document.querySelector("#volume_out").value = val;

    if (gChannel)
    {
        var result = gChannel.setVolume(parseFloat(val));
        CHECK_RESULT(result);
    }
}

// Function called when user presses HTML stop all sounds button.
function stopAll()
{
    var mcgout = {};
    var result;

    result = gSystem.getMasterChannelGroup(mcgout);
    CHECK_RESULT(result);

    var mcg = mcgout.val;
    result = mcg.stop();
    CHECK_RESULT(result);
}

function channelCallback(channelcontrol, controltype, callbacktype, commanddata1, commanddata2)
{
    if (callbacktype === FMOD.CHANNELCONTROL_CALLBACK_END)
    {
        console.log("CALLBACK : Channel Ended");
        gChannel = null;
    }

    return FMOD.OK;
}

// Function called when user presses HTML Play Sound button, with parameter 0, 1 or 2.
function playSound(soundid)
{
    var channelOut = {};
    var result;

    result = gSystem.playSound(gSound[parseInt(soundid)], null, true, channelOut);
    CHECK_RESULT(result);
    gChannel = channelOut.val;

    result = gChannel.setCallback(channelCallback)
    CHECK_RESULT(result);

    result = gChannel.setPaused(false);
    CHECK_RESULT(result);
}

// Function called when user presses HTML toggle effects button.
function toggleEffects()
{
    var channelGroupOut = {};
    var channelGroup;
    var result;

    result = gSystem.getMasterChannelGroup(channelGroupOut);
    CHECK_RESULT(result);

    channelGroup = channelGroupOut.val;

    if (!gDSP)
    {
        // Create the Reverb DSP
        var dspOut = {}
        result = gSystem.createDSPByType(FMOD.DSP_TYPE_SFXREVERB, dspOut);
        CHECK_RESULT(result);

        gDSP = dspOut.val;

        // Adjust some parameters of the DSP
        result = gDSP.setParameterFloat(FMOD.DSP_SFXREVERB_DECAYTIME, 5000.0);
        result = gDSP.setParameterFloat(FMOD.DSP_SFXREVERB_WETLEVEL, -3.0);
        result = gDSP.setParameterFloat(FMOD.DSP_SFXREVERB_DRYLEVEL, -2.0);
        CHECK_RESULT(result);

        // Add the DSP to the channel
        result = channelGroup.addDSP(FMOD.CHANNELCONTROL_DSP_TAIL, gDSP);
        CHECK_RESULT(result);

        document.querySelector("#effects_out").value = "On";
    }
    else
    {
        result = channelGroup.removeDSP(gDSP);
        CHECK_RESULT(result);

        gDSP.release();
        gDSP = null;

        document.querySelector("#effects_out").value = "Off";
    }
}

// Called from main, does some application setup.  In our case we will load some sounds.
function initApplication()
{
    console.log("Loading sounds\n");

    // Create a sound that loops
    var outval = {};
    var result;
    var exinfo = FMOD.CREATESOUNDEXINFO();

    exinfo.userdata = 12345;
    console.log("FMOD.CREATESOUNDEXINFO::userdata = " + exinfo.userdata)

    result = gSystem.createSound("/dog.wav", FMOD.LOOP_OFF, exinfo, outval);
    CHECK_RESULT(result);
    gSound[0] = outval.val;

    gSound[0].getUserData(outval);

    console.log("Sound::getUserData.  userdata = " + outval.val)

    result = gSystem.createSound("/lion.wav", FMOD.LOOP_OFF, null, outval);
    CHECK_RESULT(result);
    gSound[1] = outval.val;

    result = gSystem.createSound("/wave.mp3", FMOD.LOOP_OFF, null, outval);
    CHECK_RESULT(result);
    gSound[2] = outval.val;
}

// Called from main, on an interval that updates at a regular rate (like in a game loop).
// Prints out information, about the system, and importantly calles System::udpate().
function updateApplication()
{
    var cpu = {};
    var result;

    result = gSystem.getCPUUsage(cpu);
    CHECK_RESULT(result);

    var channelsplaying = {};
    result = gSystem.getChannelsPlaying(channelsplaying, null);
    CHECK_RESULT(result);

    document.querySelector("#display_out").value = "Channels Playing = " + channelsplaying.val +
                                                   " : CPU = dsp " + cpu.dsp.toFixed(2) +
                                                   "% stream " + cpu.stream.toFixed(2) +
                                                   "% update " + cpu.update.toFixed(2) +
                                                   "% total " + (cpu.dsp + cpu.stream + cpu.update).toFixed(2) +
                                                   "%";

    var numbuffers = {};
    var buffersize = {};
    result = gSystem.getDSPBufferSize(buffersize, numbuffers);
    CHECK_RESULT(result);

    var rate = {};
    result = gSystem.getSoftwareFormat(rate, null, null);
    CHECK_RESULT(result);

    var sysrate = {};
    result = gSystem.getDriverInfo(0, null, null, sysrate, null, null);
    CHECK_RESULT(result);

    var ms = numbuffers.val * buffersize.val * 1000 / rate.val;
    document.querySelector("#display_out2").value = "Mixer rate = " + rate.val + "hz : System rate = " + sysrate.val + "hz : DSP buffer size = " + numbuffers.val + " buffers of " + buffersize.val + " samples (" + ms.toFixed(2) + " ms)";
    if (rate.val != sysrate.val)
    {
        document.querySelector("#display_out3").value = "Warning.  Mixer rate/output rate are different.  A resampler isnow added, adding CPU overhead and 1 buffer of latency.  See playsound.js startup code to avoid this.";
    }
    // Update FMOD
    result = gSystem.update();
    CHECK_RESULT(result);
}
