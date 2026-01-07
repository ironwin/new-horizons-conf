# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

alias ll='ls -al'
alias monitoroff='export DISPLAY=:0; xset dpms force off'
alias monitoron='export DISPLAY=:0; xset dpms force on'
alias mydb='mysql --table --host=0.0.0.0 --port=3306 --user=stock -pmy@raspberry2 stock'
alias mydba='sudo mysql -u root -p'
alias mydbdump='mysqldump --login-path=stock --column-statistics=0 stock > stock.dump'
alias mydbs='mysql --table --host=0.0.0.0 --port=3306 --user=stock -pmy@raspberry2 stock'
alias mydbv='mysql --table --host=0.0.0.0 --port=3306 --user=vote -pmy@raspberry2 vote'
