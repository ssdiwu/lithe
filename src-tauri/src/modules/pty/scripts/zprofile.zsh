# lithe-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _lithe_user_zdotdir="${LITHE_USER_ZDOTDIR:-$HOME}"
  [ -f "$_lithe_user_zdotdir/.zprofile" ] && source "$_lithe_user_zdotdir/.zprofile"
  unset _lithe_user_zdotdir
}
:
