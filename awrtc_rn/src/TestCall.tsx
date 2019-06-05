import * as React from 'react';
import { Button } from 'react-native';
import * as awrtc from './awrtc';

class TestCall extends React.Component {
  mNetConfig: any = new awrtc.NetworkConfig();
  mCall: any = null;
  mIntervalId: any = -1;
  mLocalVideo: any = null;
  mRemoteVideo: any = {};
  mAddress: string = 'KORJXWP';
  state = {
    address: 'qsdf',
    callStarted: false,
    mIsRunning: false

  }

  constructor(props: {}) {
    super(props);
    this.mNetConfig = {
      IceServers: [
        { urls: "stun:stun.because-why-not.com:443" },
        { urls: "stun:stun.l.google.com:19302" }
      ],
      IsConference: false,
      SignalingUrl: "wss://signaling.because-why-not.com/callapp",
    }
  }
  Start(address, audio, video) {
    if (this.mCall != null)
      this.Stop();
    this.setState({ mIsRunning: true })
    //this.Ui_OnStart();
    console.log("start");
    console.log("Using signaling server url: " + this.mNetConfig.SignalingUrl);
    //create media configuration
    var config = new awrtc.MediaConfig();
    config.Audio = audio;
    config.Video = video;
    config.IdealWidth = 640;
    config.IdealHeight = 480;
    config.IdealFps = 30;
    //For usage in HTML set FrameUpdates to false and wait for  MediaUpdate to
    //get the VideoElement. By default awrtc would deliver frames individually
    //for use in Unity WebGL
    console.log("requested config:" + JSON.stringify(config));
    //setup our high level call class.
    this.mCall = new awrtc.BrowserWebRtcCall(this.mNetConfig);
    //handle events (get triggered after Configure / Listen call)
    //+ugly lambda to avoid loosing "this" reference
    this.mCall.addEventListener((sender, args) => {
      this.OnNetworkEvent(sender, args);
    });
    //As the system is designed for realtime graphics we have to call the Update method. Events are only
    //triggered during this Update call!
    this.mIntervalId = setInterval(() => {
      this.Update();
    }, 50);
    //configure media. This will request access to media and can fail if the user doesn't have a proper device or
    //blocks access
    this.mCall.Configure(config);
    //Try to listen to the address 
    //Conference mode = everyone listening will connect to each other
    //Call mode -> If the address is free it will wait for someone else to connect
    //          -> If the address is used then it will fail to listen and then try to connect via Call(address);
    this.mCall.Listen(address);
  }

  Stop() {
    this.Cleanup();
  }

  Cleanup() {
    if (this.mCall != null) {
      this.mCall.Dispose();
      this.mCall = null;
      clearInterval(this.mIntervalId);
      this.mIntervalId = -1;
      this.setState({ mIsRunning: false })

      this.mLocalVideo = null;
      this.mRemoteVideo = {};
    }
    //this.Ui_OnCleanup();
  }

  Update() {
    if (this.mCall != null)
      this.mCall.Update();
  }

  OnNetworkEvent(sender, args) {
    console.log(args);
    //User gave access to requested camera/ microphone
    if (args.Type == awrtc.CallEventType.ConfigurationComplete) {
      console.log("configuration complete");
    }
    else if (args.Type == awrtc.CallEventType.MediaUpdate) {
      console.log(args);
      let margs = args;
      if (this.mLocalVideo == null && margs.ConnectionId == awrtc.ConnectionId.INVALID) {
        var videoElement = margs.VideoElement;
        this.mLocalVideo = videoElement;
        //this.Ui_OnLocalVideo(videoElement);
        console.log("local video added resolution:" + videoElement.videoWidth + videoElement.videoHeight + " fps: ??");
        console.log(args.mVideoElement);
      }
      else if (margs.ConnectionId != awrtc.ConnectionId.INVALID && this.mRemoteVideo[margs.ConnectionId.id] == null) {
        var videoElement = margs.VideoElement;
        this.mRemoteVideo[margs.ConnectionId.id] = videoElement;
        //this.Ui_OnRemoteVideo(videoElement, margs.ConnectionId);
        console.log("remote video added resolution:" + videoElement.videoWidth + videoElement.videoHeight + " fps: ??");
      }
    }
    else if (args.Type == awrtc.CallEventType.ListeningFailed) {
      //First attempt of this example is to try to listen on a certain address
      //for conference calls this should always work (expect the internet is dead)
      if (this.mNetConfig.IsConference == false) {
        //no conference call and listening failed? someone might have claimed the address.
        //Try to connect to existing call
        this.mCall.Call(this.mAddress);
      }
      else {
        let errorMsg = "Listening failed. Offline? Server dead?";
        console.error(errorMsg);
        //this.Ui_OnError(errorMsg);
        this.Cleanup();
        return;
      }
    }
    else if (args.Type == awrtc.CallEventType.ConnectionFailed) {
      //Outgoing call failed entirely. This can mean there is no address to connect to,
      //server is offline, internet is dead, firewall blocked access, ...
      let errorMsg = "Connection failed. Offline? Server dead? ";
      console.error(errorMsg);
      //this.Ui_OnError(errorMsg);
      this.Cleanup();
      return;
    }
    else if (args.Type == awrtc.CallEventType.CallEnded) {
      //call ended or was disconnected
      var callEndedEvent = args;
      console.log("call ended with id " + callEndedEvent.ConnectionId.id);
      delete this.mRemoteVideo[callEndedEvent.ConnectionId.id];
      //this.Ui_OnLog("Disconnected from user with id " + callEndedEvent.ConnectionId.id);
      //check if this was the last user
      if (this.mNetConfig.IsConference == false && Object.keys(this.mRemoteVideo).length == 0) {
        //1 to 1 call and only user left -> quit
        this.Cleanup();
        return;
      }
    }
    else if (args.Type == awrtc.CallEventType.Message) {
      //no ui for this yet. simply echo messages for testing
      let messageArgs = args;
      this.mCall.Send(messageArgs.Content, messageArgs.Reliable, messageArgs.ConnectionId);
    }
    else if (args.Type == awrtc.CallEventType.DataMessage) {
      //no ui for this yet. simply echo messages for testing
      let messageArgs = args;
      this.mCall.SendData(messageArgs.Content, messageArgs.Reliable, messageArgs.ConnectionId);
    }
    else {
      console.log("Unhandled event: " + args.Type);
    }
  }

  render() {
    return (
      <Button
        title={this.state.mIsRunning ? 'off' : 'on'}
        onPress={() => {
          if (!this.state.mIsRunning)
            this.Start(this.state.address, true, false);
          else
            this.Stop();
        }}
      >

      </Button>
    )
  }
}

export default TestCall;