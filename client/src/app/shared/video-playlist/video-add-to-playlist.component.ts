import { Component, Input, OnInit } from '@angular/core'
import { VideoPlaylistService } from '@app/shared/video-playlist/video-playlist.service'
import { AuthService, Notifier } from '@app/core'
import { forkJoin } from 'rxjs'
import { VideoPlaylistCreate, VideoPlaylistPrivacy } from '@shared/models'
import { FormReactive, FormValidatorService, VideoPlaylistValidatorsService } from '@app/shared/forms'
import { I18n } from '@ngx-translate/i18n-polyfill'

type PlaylistSummary = {
  id: number
  inPlaylist: boolean
  displayName: string
  playlistInfoOpened: boolean

  startTimestamp?: number
  stopTimestamp?: number
}

@Component({
  selector: 'my-video-add-to-playlist',
  styleUrls: [ './video-add-to-playlist.component.scss' ],
  templateUrl: './video-add-to-playlist.component.html'
})
export class VideoAddToPlaylistComponent extends FormReactive implements OnInit {
  @Input() videoId: number
  @Input() currentVideoTimestamp: number

  isNewPlaylistBlockOpened = false
  videoPlaylists: PlaylistSummary[] = []

  constructor (
    protected formValidatorService: FormValidatorService,
    private authService: AuthService,
    private notifier: Notifier,
    private i18n: I18n,
    private videoPlaylistService: VideoPlaylistService,
    private videoPlaylistValidatorsService: VideoPlaylistValidatorsService
  ) {
    super()
  }

  get user () {
    return this.authService.getUser()
  }

  ngOnInit () {
    this.buildForm({
      'display-name': this.videoPlaylistValidatorsService.VIDEO_PLAYLIST_DISPLAY_NAME
    })

    forkJoin([
      this.videoPlaylistService.listAccountPlaylists(this.user.account, '-updatedAt'),
      this.videoPlaylistService.doesVideoExistInPlaylist(this.videoId)
    ])
      .subscribe(
        ([ playlistsResult, existResult ]) => {
          for (const playlist of playlistsResult.data) {
            const existingPlaylist = existResult[ this.videoId ].find(p => p.playlistId === playlist.id)

            this.videoPlaylists.push({
              id: playlist.id,
              displayName: playlist.displayName,
              inPlaylist: existingPlaylist !== null,
              playlistInfoOpened: false,
              startTimestamp: existingPlaylist ? existingPlaylist.startTimestamp : undefined,
              stopTimestamp: existingPlaylist ? existingPlaylist.stopTimestamp : undefined
            })
          }
        }
      )
  }

  openChange (opened: boolean) {
    if (opened === false) {
      this.isNewPlaylistBlockOpened = false

      for (const playlist of this.videoPlaylists) {
        playlist.playlistInfoOpened = false
      }
    }
  }

  openCreateBlock (event: Event) {
    event.preventDefault()

    this.isNewPlaylistBlockOpened = true
  }

  togglePlaylist (event: Event, playlist: PlaylistSummary) {
    event.preventDefault()

    if (playlist.inPlaylist === true) {
      this.removeVideoFromPlaylist(playlist)
    } else {
      this.addVideoInPlaylist(playlist)
    }

    playlist.inPlaylist = !playlist.inPlaylist
  }

  createPlaylist () {
    const displayName = this.form.value[ 'display-name' ]

    const videoPlaylistCreate: VideoPlaylistCreate = {
      displayName,
      privacy: VideoPlaylistPrivacy.PRIVATE
    }

    this.videoPlaylistService.createVideoPlaylist(videoPlaylistCreate).subscribe(
      res => {
        this.videoPlaylists.push({
          id: res.videoPlaylist.id,
          displayName,
          inPlaylist: false,
          playlistInfoOpened: false
        })

        this.isNewPlaylistBlockOpened = false
      },

      err => this.notifier.error(err.message)
    )
  }

  private removeVideoFromPlaylist (playlist: PlaylistSummary) {
    this.videoPlaylistService.removeVideoFromPlaylist(playlist.id, this.videoId)
        .subscribe(
          () => {
            this.notifier.success(this.i18n('Video removed from {{name}}', { name: playlist.displayName }))

            playlist.inPlaylist = false
          },

          err => {
            this.notifier.error(err.message)

            playlist.inPlaylist = true
          }
        )
  }

  private addVideoInPlaylist (playlist: PlaylistSummary) {
    this.videoPlaylistService.addVideoInPlaylist(playlist.id, { videoId: this.videoId })
      .subscribe(
        () => {
          this.notifier.success(this.i18n('Video added in {{name}}', { name: playlist.displayName }))

          playlist.inPlaylist = true
        },

        err => {
          this.notifier.error(err.message)

          playlist.inPlaylist = false
        }
      )
  }
}
