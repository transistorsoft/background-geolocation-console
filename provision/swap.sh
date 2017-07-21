#CORE FILE
SWAP_SIZE=4G
SWAP_PATH="/swapfile"

ls /swapfile || (
    # Start script
    sudo fallocate -l $SWAP_SIZE $SWAP_PATH
    sudo chmod 600 $SWAP_PATH
    sudo mkswap $SWAP_PATH
    sudo swapon $SWAP_PATH
    echo "$SWAP_PATH   none    swap    sw    0   0" | sudo tee /etc/fstab -a
    sudo sysctl vm.swappiness=10
    echo "vm.swappiness=10" | sudo tee /etc/sysctl.conf -a
    sudo sysctl vm.vfs_cache_pressure=50
    echo "vm.vfs_cache_pressure=50" | sudo tee /etc/sysctl.conf -a
)
