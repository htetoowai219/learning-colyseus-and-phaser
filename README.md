# Colyseus + Phaser Multiplayer

My little learning project: a real-time multiplayer game with a Colyseus server
and a Phaser client. Server does all the thinking, client predicts so your own
ship feels instant. Runs on desktop and phones (virtual joystick included).

## Installation

You need Node 22 or newer. Then, from the project root:

```bash
cd server && npm install
cd ../client && npm install
```

## Usage

Run these in two separate terminals.

```bash
# terminal 1 - the game server
cd server
npm start
```

```bash
# terminal 2 - the client
cd client
npm start
```

Now open http://localhost:1234. Open it in a few tabs or devices and everyone
joins the same room (max 4).

**Controls:** arrow keys, or the joystick in the bottom-left corner.

**Want to play from your phone?** Make sure it's on the same Wi-Fi, then open
`http://<your-computer-ip>:1234` on the phone (find the IP with `ip addr`).
Your firewall needs to allow ports 1234 and 2567. If it feels laggy, get the
host on Ethernet and the phone on 5 GHz - Wi-Fi is usually the whole problem.

**Want to fake a bad connection?** Start the server like this:

```bash
COLYSEUS_LATENCY=200 npm start
```

**Curious about the two modes for other players?** Add `?remote=extrapolate` to
the URL to compare it with the default `lerp`.

## What the overlay means

There's a little debug box in the top-left corner while you play:

```text
RTT 45ms (last 52)  jitter 2.1ms
pending 3  tick 60Hz  patch 33ms
fps 60
mode lerp  lead ~6px
```

| Thing | What it means |
| --- | --- |
| **RTT** | Round-trip time to the server. Smoothed value first, last sample in brackets. Reads ~25-40ms even on loopback because the ack waits for the next network update, so don't panic if it's not 0 on your own machine. |
| **jitter** | How much the RTT jumps around. High jitter = stuttery, even if the average ping looks okay. |
| **pending** | Inputs I've sent that the server hasn't confirmed yet. Basically your prediction lead. |
| **tick** | How often the server simulates the world (60 times a second). |
| **patch** | How often the server sends updates back (every 33ms). |
| **fps** | Your machine's frame rate. Low fps = your device, high ping = the network. |
| **mode** | How other players are drawn: `lerp` (smooth, slightly in the past) or `extrapolate` (guesses ahead, can overshoot). |
| **lead** | Roughly how far ahead your sprite is drawn compared to the last server-confirmed position, in pixels. |

One gotcha if you ever edit the code: `client/shared/` and `server/src/shared/`
are copies of each other on purpose. Change one, change both, or prediction and
the server will disagree.
