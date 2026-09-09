# Networking Game Shared Names

## Can be edited ##

  ## Game Phases

  ```ts
  'waiting'
  'playing'
  'paused'
  'ended'

  ## Shared Data Names

  roomId
  playerId
  connectionId
  username
  score
  connections
  winnerId
  timeRemaining
  systemMessage

  ## Socket Event Names

  game_started
  game_state_updated
  connection_collected
  score_updated
  game_ended
  system_message
  pause_game
  resume_game
  quit_game
  player_disconnected

  ## Main Payload Names

  NetworkingGameState
  NetworkingPlayer
  NetworkingConnection
  ConnectionCollectedPayload
  GameStateUpdatedPayload
  GameMenuActionPayload
  SystemMessagePayload
  GameEndedPayload

