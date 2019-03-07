import { Component, OnInit } from '@angular/core'
import { Notifier } from '@app/core'
import { AuthService } from '../../core/auth'
import { ConfirmService } from '../../core/confirm'
import { User } from '@app/shared'
import { flatMap } from 'rxjs/operators'
import { I18n } from '@ngx-translate/i18n-polyfill'
import { VideoPlaylist } from '@app/shared/video-playlist/video-playlist.model'
import { ComponentPagination } from '@app/shared/rest/component-pagination.model'
import { VideoPlaylistService } from '@app/shared/video-playlist/video-playlist.service'
import { VideoPlaylistType } from '@shared/models'

@Component({
  selector: 'my-account-video-playlists',
  templateUrl: './my-account-video-playlists.component.html',
  styleUrls: [ './my-account-video-playlists.component.scss' ]
})
export class MyAccountVideoPlaylistsComponent implements OnInit {
  videoPlaylists: VideoPlaylist[] = []

  pagination: ComponentPagination = {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: null
  }

  private user: User

  constructor (
    private authService: AuthService,
    private notifier: Notifier,
    private confirmService: ConfirmService,
    private videoPlaylistService: VideoPlaylistService,
    private i18n: I18n
  ) {}

  ngOnInit () {
    this.user = this.authService.getUser()

    this.loadVideoPlaylists()
  }

  async deleteVideoPlaylist (videoPlaylist: VideoPlaylist) {
    const res = await this.confirmService.confirm(
      this.i18n(
        'Do you really want to delete {{playlistDisplayName}}?',
        { playlistDisplayName: videoPlaylist.displayName }
      ),
      this.i18n('Delete')
    )
    if (res === false) return

    this.videoPlaylistService.removeVideoPlaylist(videoPlaylist)
      .subscribe(
        () => {
          this.videoPlaylists = this.videoPlaylists
                                    .filter(p => p.id !== videoPlaylist.id)

          this.notifier.success(
            this.i18n('Playlist {{playlistDisplayName}} deleted.', { playlistDisplayName: videoPlaylist.displayName })
          )
        },

        error => this.notifier.error(error.message)
      )
  }

  isRegularPlaylist (playlist: VideoPlaylist) {
    return playlist.type.id === VideoPlaylistType.REGULAR
  }

  onNearOfBottom () {
    // Last page
    if (this.pagination.totalItems <= (this.pagination.currentPage * this.pagination.itemsPerPage)) return

    this.pagination.currentPage += 1
    this.loadVideoPlaylists()
  }

  private loadVideoPlaylists () {
    this.authService.userInformationLoaded
        .pipe(flatMap(() => this.videoPlaylistService.listAccountPlaylists(this.user.account, '-updatedAt')))
        .subscribe(res => {
          this.videoPlaylists = this.videoPlaylists.concat(res.data)
          this.pagination.totalItems = res.total
        })
  }
}
